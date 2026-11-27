import datetime
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from db.database import get_db
from db.models import LostFoundPost, LostFoundMatch, Message, User, AuditLog, PostRemark, MatchOpinion
from db.audit import audit
from utils.auth import get_current_user, get_current_user_optional

lost_found_router = APIRouter(prefix="/api/lost-found", tags=["Lost & Found Pet Registry"])

# Helper: Haversine distance in kilometers
def haversine_distance(lat1: Optional[float], lon1: Optional[float], lat2: Optional[float], lon2: Optional[float]) -> float:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0
    try:
        R = 6371.0  # Earth radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c
    except Exception:
        return 999.0

# Helper: Text word similarity score between 0.0 and 1.0
def text_similarity(str1: Optional[str], str2: Optional[str]) -> float:
    if not str1 or not str2:
        return 0.2
    w1 = set(str1.lower().replace('/', ' ').replace('-', ' ').split())
    w2 = set(str2.lower().replace('/', ' ').replace('-', ' ').split())
    if not w1 or not w2:
        return 0.0
    intersection = w1.intersection(w2)
    union = w1.union(w2)
    return len(intersection) / len(union)

# Global lazy cache for Re-ID model and embeddings
_REID_MODEL = None
_REID_TRANSFORM = None
_PHOTO_EMB_CACHE = {}

def get_reid_components():
    global _REID_MODEL, _REID_TRANSFORM
    if _REID_MODEL is None:
        try:
            import os
            from animal_reid import load_model, build_transform, DEFAULT_IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD, CHECKPOINT_PATH
            if os.path.exists(CHECKPOINT_PATH):
                _REID_MODEL, _ = load_model(CHECKPOINT_PATH, 'cpu')
                _REID_TRANSFORM = build_transform(DEFAULT_IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD)
        except Exception as e:
            print(f"[Re-ID Warning] Could not load OSNet: {e}")
    return _REID_MODEL, _REID_TRANSFORM

def compute_visual_similarity(photo1: Optional[str], photo2: Optional[str]) -> float:
    if not photo1 or not photo2:
        return 0.50
    # Exact same URL or local path => 100% match
    if photo1.strip().lower() == photo2.strip().lower():
        return 1.00

    # Extract base names or IDs from Unsplash / upload paths
    # If the user uploaded or referenced the exact same photo ID
    p1_key = photo1.split('?')[0].strip().lower()
    p2_key = photo2.split('?')[0].strip().lower()
    if p1_key == p2_key:
        return 1.00

    try:
        import io, urllib.request, os
        from PIL import Image
        import numpy as np
        from animal_reid import extract_embedding

        model, transform = get_reid_components()
        if not model or not transform:
            return 0.50

        def get_emb(url: str):
            if url in _PHOTO_EMB_CACHE:
                return _PHOTO_EMB_CACHE[url]
            img = None
            if url.startswith('http://') or url.startswith('https://'):
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                resp = urllib.request.urlopen(req, timeout=4)
                img = Image.open(io.BytesIO(resp.read())).convert('RGB')
            else:
                local_path = url.lstrip('/')
                for base in ['frontend/public', 'frontend', '.']:
                    cand = os.path.join(base, local_path)
                    if os.path.exists(cand):
                        img = Image.open(cand).convert('RGB')
                        break
            if img:
                tensor = transform(img).unsqueeze(0)
                emb = extract_embedding(model, tensor, 'cpu')[0]
                _PHOTO_EMB_CACHE[url] = emb
                return emb
            return None

        emb1 = get_emb(photo1)
        emb2 = get_emb(photo2)
        if emb1 is not None and emb2 is not None:
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 > 0 and norm2 > 0:
                cos_sim = float(np.dot(emb1, emb2) / (norm1 * norm2))
                return max(0.0, min(1.0, cos_sim))
    except Exception as e:
        print(f"[Visual Sim Exception] {e}")

    return 0.40

# Helper: Calculate smart match score between two posts (Visual Re-ID heavy)
def calculate_match_score(post1: LostFoundPost, post2: LostFoundPost) -> float:
    # 1. Visual Biometric Re-ID Similarity (55% of the score)
    vis_sim = compute_visual_similarity(post1.photo, post2.photo)

    # 2. Distance score (max 25 km, 20% weight)
    dist = haversine_distance(post1.lat, post1.lng, post2.lat, post2.lng)
    dist_score = max(0.0, 1.0 - (dist / 25.0)) if dist <= 25.0 else 0.0

    # 3. Text/Breed/Colour similarity (15% weight)
    text1 = f"{post1.breed or ''} {post1.colour_markings or ''} {post1.dog_name or ''}"
    text2 = f"{post2.breed or ''} {post2.colour_markings or ''} {post2.dog_name or ''}"
    txt_score = text_similarity(text1, text2)

    # 4. Date window similarity (max 45 days, 10% weight)
    d1 = post1.event_date or post1.created_at or datetime.datetime.utcnow()
    d2 = post2.event_date or post2.created_at or datetime.datetime.utcnow()
    days_diff = abs((d1 - d2).days)
    time_score = max(0.0, 1.0 - (days_diff / 45.0)) if days_diff <= 45 else 0.0

    # If the dog photo is identical (same dog picture), score must be >= 95%
    if vis_sim >= 0.95:
        total = 0.95 + (dist_score * 0.05)
    else:
        # Weighted composite score: visual embedding dominates
        total = (vis_sim * 0.55) + (dist_score * 0.20) + (txt_score * 0.15) + (time_score * 0.10)

    return round(total * 100.0, 1)

def format_post_dict(post: LostFoundPost, db: Session, viewer_user: Optional[User] = None) -> dict:
    owner = db.query(User).filter(User.id == post.owner_id).first() if post.owner_id else None
    owner_name = owner.full_name or owner.username if owner else "Anonymous Citizen"
    
    # Check if viewer can see phone number
    can_see_phone = False
    if viewer_user:
        if viewer_user.role in ["ngo_staff", "admin", "govt_official"]:
            can_see_phone = True
        elif viewer_user.id == post.owner_id:
            can_see_phone = True
        else:
            # Check if there is a confirmed match involving viewer's posts
            viewer_posts = db.query(LostFoundPost.id).filter(LostFoundPost.owner_id == viewer_user.id).subquery()
            confirmed_match = db.query(LostFoundMatch).filter(
                LostFoundMatch.status == "confirmed",
                or_(
                    and_(LostFoundMatch.post_a == post.id, LostFoundMatch.post_b.in_(viewer_posts)),
                    and_(LostFoundMatch.post_b == post.id, LostFoundMatch.post_a.in_(viewer_posts))
                )
            ).first()
            if confirmed_match:
                can_see_phone = True

    phone_display = (owner.phone if owner else None) if can_see_phone else "Hidden until match confirmed"

    # Get matches for this post
    matches_q = db.query(LostFoundMatch).filter(
        or_(LostFoundMatch.post_a == post.id, LostFoundMatch.post_b == post.id)
    ).all()

    matches_list = []
    for m in matches_q:
        other_id = m.post_b if m.post_a == post.id else m.post_a
        other_post = db.query(LostFoundPost).filter(LostFoundPost.id == other_id).first()
        if other_post:
            approver = db.query(User).filter(User.id == m.approved_by).first() if m.approved_by else None
            approver_name = (approver.full_name or approver.username) if approver else None
            other_owner = db.query(User).filter(User.id == other_post.owner_id).first() if other_post.owner_id else None
            other_owner_name = (other_owner.full_name or other_owner.username) if other_owner else "Citizen"
            matches_list.append({
                "match_id": m.id,
                "score": m.score,
                "status": m.status,
                "matched_post_id": other_post.id,
                "kind": other_post.kind,
                "dog_name": other_post.dog_name,
                "breed": other_post.breed,
                "photo": other_post.photo,
                "address": other_post.address,
                "owner_id": other_post.owner_id,
                "owner_name": other_owner_name,
                "approved_by": m.approved_by,
                "approved_by_name": approver_name,
                "reviewed_at": m.reviewed_at.isoformat() if m.reviewed_at else None,
                "event_date": other_post.event_date.isoformat() if other_post.event_date else None
            })

    # Message count & remarks
    msg_count = db.query(Message).filter(Message.post_id == post.id).count()
    remarks = db.query(PostRemark).filter(PostRemark.post_id == post.id).order_by(PostRemark.created_at.desc()).all()
    remarks_list = [{
        "id": r.id,
        "user_id": r.user_id,
        "author_name": r.author_name or "Animal Advocate",
        "comment": r.comment,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in remarks]

    return {
        "id": post.id,
        "kind": post.kind,
        "owner_id": post.owner_id,
        "owner_name": owner_name,
        "owner_phone": phone_display,
        "phone_hidden": not can_see_phone,
        "dog_name": post.dog_name or ("Lost Pet" if post.kind == "lost" else "Found Pet"),
        "breed": post.breed or "Indian Pariah / Desi",
        "colour_markings": post.colour_markings or "Not specified",
        "age_sex": post.age_sex or "Unknown",
        "collar_microchip": post.collar_microchip or "None",
        "photo": post.photo or "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop",
        "lat": post.lat or 12.9716,
        "lng": post.lng or 77.5946,
        "address": post.address or "Bengaluru",
        "city": post.city or "Bengaluru",
        "state": post.state or "Karnataka",
        "event_date": post.event_date.isoformat() if post.event_date else post.created_at.isoformat(),
        "reward": post.reward or None,
        "contact_pref": post.contact_pref or "in_app",
        "status": post.status or "open",
        "is_archived": bool(getattr(post, 'is_archived', False)),
        "upvotes": getattr(post, 'upvotes', 0) or 0,
        "downvotes": getattr(post, 'downvotes', 0) or 0,
        "remarks": remarks_list,
        "remarks_count": len(remarks_list),
        "expires_at": post.expires_at.isoformat() if post.expires_at else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "matches_count": len(matches_list),
        "matches": matches_list,
        "messages_count": msg_count
    }


# -----------------------------------------------------------------------------
# 1. CREATE LOST OR FOUND POST (Auth Required)
# -----------------------------------------------------------------------------
@lost_found_router.post("/", status_code=status.HTTP_201_CREATED)
def create_lost_found_post(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    kind = data.get("kind", "lost").lower()
    if kind not in ["lost", "found"]:
        raise HTTPException(status_code=400, detail="Invalid kind. Must be 'lost' or 'found'.")

    event_dt = datetime.datetime.utcnow()
    if data.get("event_date"):
        try:
            event_dt = datetime.datetime.fromisoformat(str(data["event_date"]).replace('Z', ''))
        except Exception:
            pass

    expires_dt = datetime.datetime.utcnow() + datetime.timedelta(days=60)

    post = LostFoundPost(
        kind=kind,
        owner_id=current_user.id,
        dog_name=data.get("dog_name"),
        breed=data.get("breed", "Indian Pariah / Desi"),
        colour_markings=data.get("colour_markings"),
        age_sex=data.get("age_sex"),
        collar_microchip=data.get("collar_microchip"),
        photo=data.get("photo"),
        lat=float(data.get("lat", 12.9716)),
        lng=float(data.get("lng", 77.5946)),
        address=data.get("address", "Bengaluru"),
        city=data.get("city", "Bengaluru"),
        state=data.get("state", "Karnataka"),
        event_date=event_dt,
        reward=data.get("reward"),
        contact_pref=data.get("contact_pref", "in_app"),
        status="open",
        expires_at=expires_dt,
        created_at=datetime.datetime.utcnow()
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Smart Matching Algorithm: compare with active opposite posts
    opposite_kind = "found" if kind == "lost" else "lost"
    candidates = db.query(LostFoundPost).filter(
        LostFoundPost.kind == opposite_kind,
        LostFoundPost.status.in_(["open", "matched"])
    ).all()

    new_matches = []
    for candidate in candidates:
        score = calculate_match_score(post, candidate)
        if score >= 35.0:
            match_row = LostFoundMatch(
                post_a=post.id if post.kind == "lost" else candidate.id,
                post_b=candidate.id if post.kind == "lost" else post.id,
                score=score,
                status="suggested"
            )
            db.add(match_row)
            new_matches.append(match_row)

    if new_matches:
        db.commit()

    audit(db, action="create", entity_type="lost_found_post", entity_id=str(post.id), actor_id=current_user.id, after={"kind": kind, "dog_name": post.dog_name})

    return format_post_dict(post, db, current_user)


# -----------------------------------------------------------------------------
# 2. LIST LOST/FOUND POSTS (Public Open Browsing)
# -----------------------------------------------------------------------------
@lost_found_router.get("/")
def list_lost_found_posts(
    kind: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    breed: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(LostFoundPost)

    if kind and kind.lower() in ["lost", "found"]:
        query = query.filter(LostFoundPost.kind == kind.lower())

    if status and status != "all":
        query = query.filter(LostFoundPost.status == status)

    if breed:
        query = query.filter(LostFoundPost.breed.ilike(f"%{breed}%"))

    if city or area:
        loc_term = f"%{city or area}%"
        query = query.filter(or_(LostFoundPost.address.ilike(loc_term), LostFoundPost.city.ilike(loc_term)))

    if q:
        st = f"%{q}%"
        query = query.filter(
            or_(
                LostFoundPost.dog_name.ilike(st),
                LostFoundPost.breed.ilike(st),
                LostFoundPost.colour_markings.ilike(st),
                LostFoundPost.address.ilike(st)
            )
        )

    posts = query.order_by(LostFoundPost.created_at.desc()).all()

    # Optimized bulk fetching: Preload all users, remarks, matches in 3 batch queries
    all_user_ids = {p.owner_id for p in posts if p.owner_id}
    post_ids = [p.id for p in posts]

    users_map = {}
    if all_user_ids:
        users = db.query(User).filter(User.id.in_(all_user_ids)).all()
        users_map = {u.id: u for u in users}

    matches_map = {}
    if post_ids:
        raw_matches = db.query(LostFoundMatch).filter(
            or_(LostFoundMatch.post_a.in_(post_ids), LostFoundMatch.post_b.in_(post_ids))
        ).all()
        # Collect matched post details
        all_matched_ids = set()
        for m in raw_matches:
            all_matched_ids.add(m.post_a)
            all_matched_ids.add(m.post_b)
        all_posts_lookup = {p.id: p for p in posts}
        missing_ids = all_matched_ids - set(all_posts_lookup.keys())
        if missing_ids:
            extra_posts = db.query(LostFoundPost).filter(LostFoundPost.id.in_(missing_ids)).all()
            for ep in extra_posts:
                all_posts_lookup[ep.id] = ep

        for m in raw_matches:
            for pid in (m.post_a, m.post_b):
                if pid not in matches_map:
                    matches_map[pid] = []
                other_id = m.post_b if m.post_a == pid else m.post_a
                other_post = all_posts_lookup.get(other_id)
                if other_post:
                    other_owner = users_map.get(other_post.owner_id)
                    matches_map[pid].append({
                        "match_id": m.id,
                        "score": m.score,
                        "status": m.status,
                        "matched_post_id": other_post.id,
                        "kind": other_post.kind,
                        "dog_name": other_post.dog_name,
                        "breed": other_post.breed,
                        "photo": other_post.photo,
                        "address": other_post.address,
                        "owner_id": other_post.owner_id,
                        "owner_name": (other_owner.full_name or other_owner.username) if other_owner else "Citizen",
                        "owner_phone": other_owner.phone if (other_owner and (m.status == "confirmed" or (current_user and current_user.role in ["ngo_staff", "admin", "govt_official"]))) else ("Hidden until match confirmed" if m.status != "confirmed" else "+91 98450 12345"),
                        "approved_by": m.approved_by,
                        "reviewed_at": m.reviewed_at.isoformat() if m.reviewed_at else None
                    })

    remarks_map = {}
    if post_ids:
        remarks = db.query(PostRemark).filter(PostRemark.post_id.in_(post_ids)).order_by(PostRemark.created_at.desc()).all()
        for r in remarks:
            if r.post_id not in remarks_map:
                remarks_map[r.post_id] = []
            remarks_map[r.post_id].append({
                "id": r.id,
                "author_name": r.author_name or "Animal Advocate",
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })

    result = []
    for p in posts:
        owner = users_map.get(p.owner_id)
        owner_name = (owner.full_name or owner.username) if owner else "Anonymous Citizen"
        p_matches = matches_map.get(p.id, [])
        p_remarks = remarks_map.get(p.id, [])

        # Check if viewer or matched post allows viewing phone
        has_confirmed = any(m.get("status") == "confirmed" for m in p_matches)
        can_view_post_phone = has_confirmed or (current_user and (current_user.role in ["ngo_staff", "admin", "govt_official"] or current_user.id == p.owner_id))
        phone_val = owner.phone if (owner and owner.phone) else "+91 98450 88219"

        result.append({
            "id": p.id,
            "kind": p.kind,
            "owner_id": p.owner_id,
            "owner_name": owner_name,
            "owner_phone": phone_val if can_view_post_phone else "Hidden until match confirmed",
            "phone_hidden": not can_view_post_phone,
            "dog_name": p.dog_name or ("Lost Pet" if p.kind == "lost" else "Found Pet"),
            "breed": p.breed or "Indian Pariah / Desi",
            "colour_markings": p.colour_markings or "Not specified",
            "age_sex": p.age_sex or "Unknown",
            "collar_microchip": p.collar_microchip or "None",
            "photo": p.photo or "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop",
            "lat": p.lat or 12.9716,
            "lng": p.lng or 77.5946,
            "address": p.address or "Bengaluru",
            "city": p.city or "Bengaluru",
            "state": p.state or "Karnataka",
            "event_date": p.event_date.isoformat() if p.event_date else (p.created_at.isoformat() if p.created_at else None),
            "reward": p.reward,
            "contact_pref": p.contact_pref or "in_app",
            "status": p.status or "open",
            "is_archived": bool(getattr(p, 'is_archived', False)),
            "upvotes": getattr(p, 'upvotes', 0) or 0,
            "downvotes": getattr(p, 'downvotes', 0) or 0,
            "remarks": p_remarks,
            "remarks_count": len(p_remarks),
            "expires_at": p.expires_at.isoformat() if p.expires_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "matches_count": len(p_matches),
            "matches": p_matches,
            "messages_count": 0
        })

    return result


# -----------------------------------------------------------------------------
# 3. GET SINGLE POST DETAILS & MATCHES
# -----------------------------------------------------------------------------
@lost_found_router.get("/{post_id}")
def get_lost_found_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Lost & Found post not found")
    return format_post_dict(post, db, current_user)


# -----------------------------------------------------------------------------
# 4. UPDATE POST (Owner or Admin/NGO)
# -----------------------------------------------------------------------------
@lost_found_router.patch("/{post_id}")
@lost_found_router.put("/{post_id}")
def update_lost_found_post(
    post_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if current_user.role not in ["admin", "ngo_staff", "govt_official"] and post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied to edit this post.")

    before_state = {"status": post.status, "dog_name": post.dog_name}

    if "dog_name" in data: post.dog_name = data["dog_name"]
    if "breed" in data: post.breed = data["breed"]
    if "colour_markings" in data: post.colour_markings = data["colour_markings"]
    if "age_sex" in data: post.age_sex = data["age_sex"]
    if "collar_microchip" in data: post.collar_microchip = data["collar_microchip"]
    if "photo" in data: post.photo = data["photo"]
    if "address" in data: post.address = data["address"]
    if "lat" in data: post.lat = float(data["lat"])
    if "lng" in data: post.lng = float(data["lng"])
    if "reward" in data: post.reward = data["reward"]
    if "status" in data:
        st = data["status"].lower()
        if st in ["open", "matched", "reunited", "closed"]:
            post.status = st

    db.commit()
    db.refresh(post)

    audit(db, action="update", entity_type="lost_found_post", entity_id=str(post.id), actor_id=current_user.id, before=before_state, after={"status": post.status, "dog_name": post.dog_name})

    return format_post_dict(post, db, current_user)


# -----------------------------------------------------------------------------
# 5. DELETE POST (Owner or Admin/NGO)
# -----------------------------------------------------------------------------
@lost_found_router.delete("/{post_id}")
def delete_lost_found_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if current_user.role not in ["admin", "ngo_staff", "govt_official"] and post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied to delete this post.")

    # Remove matches & messages
    db.query(LostFoundMatch).filter(or_(LostFoundMatch.post_a == post.id, LostFoundMatch.post_b == post.id)).delete(synchronize_session=False)
    db.query(Message).filter(Message.post_id == post.id).delete(synchronize_session=False)
    db.delete(post)
    db.commit()

    audit(db, action="delete", entity_type="lost_found_post", entity_id=str(post_id), actor_id=current_user.id)

    return {"status": "success", "message": f"Post #{post_id} deleted successfully."}


# -----------------------------------------------------------------------------
# 6. CONFIRM OR REJECT MATCH & EDIT STATUS
# -----------------------------------------------------------------------------
@lost_found_router.post("/matches/{match_id}/confirm")
def confirm_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    match = db.query(LostFoundMatch).filter(LostFoundMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    post_a = db.query(LostFoundPost).filter(LostFoundPost.id == match.post_a).first()
    post_b = db.query(LostFoundPost).filter(LostFoundPost.id == match.post_b).first()

    actor_id = current_user.id if current_user else 1

    match.status = "confirmed"
    match.approved_by = actor_id
    match.reviewed_at = datetime.datetime.utcnow()
    if post_a: post_a.status = "matched"
    if post_b: post_b.status = "matched"

    db.commit()

    audit(db, action="confirm_match", entity_type="lost_found_match", entity_id=str(match_id), actor_id=actor_id)

    return {"status": "success", "message": "Match confirmed! Phone details unlocked for both parties.", "match_id": match_id}


@lost_found_router.delete("/matches/{match_id}")
def delete_match_pair(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    match = db.query(LostFoundMatch).filter(LostFoundMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match pair not found")

    actor_id = current_user.id if current_user else 1

    # Cascade delete match opinions first if any exist
    db.query(MatchOpinion).filter(MatchOpinion.match_id == match_id).delete(synchronize_session=False)
    
    # Delete match row
    db.delete(match)
    db.commit()

    audit(db, action="delete_match", entity_type="lost_found_match", entity_id=str(match_id), actor_id=actor_id)

    return {"status": "success", "message": f"Match pair #{match_id} deleted permanently from database.", "match_id": match_id}


@lost_found_router.post("/matches/{match_id}/reject")
def reject_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    match = db.query(LostFoundMatch).filter(LostFoundMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    actor_id = current_user.id if current_user else 1

    match.status = "rejected"
    match.approved_by = actor_id
    match.reviewed_at = datetime.datetime.utcnow()
    db.commit()

    audit(db, action="reject_match", entity_type="lost_found_match", entity_id=str(match_id), actor_id=actor_id)

    return {"status": "success", "message": "Match rejected.", "match_id": match_id}


@lost_found_router.put("/matches/{match_id}/status")
def update_match_status(
    match_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    match = db.query(LostFoundMatch).filter(LostFoundMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    new_status = payload.get("status", "suggested")
    if new_status not in ["suggested", "confirmed", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid match status")

    actor_id = current_user.id if current_user else 1
    match.status = new_status
    match.approved_by = actor_id
    match.reviewed_at = datetime.datetime.utcnow()

    post_a = db.query(LostFoundPost).filter(LostFoundPost.id == match.post_a).first()
    post_b = db.query(LostFoundPost).filter(LostFoundPost.id == match.post_b).first()
    if new_status == "confirmed":
        if post_a: post_a.status = "matched"
        if post_b: post_b.status = "matched"
    elif new_status in ["rejected", "suggested"]:
        if post_a: post_a.status = "open"
        if post_b: post_b.status = "open"

    db.commit()

    audit(db, action="update_match_status", entity_type="lost_found_match", entity_id=str(match_id), actor_id=actor_id)

    return {"status": "success", "message": f"Match status updated to {new_status}.", "match_id": match_id}


# -----------------------------------------------------------------------------
# 7. IN-APP MESSAGING (GET & POST) & DIRECT USER INBOX
# -----------------------------------------------------------------------------
@lost_found_router.get("/inbox/my-messages")
def get_user_inbox_messages(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else 1
    # Fetch messages where user is sender OR recipient OR post owner
    posts_owned = [p.id for p in db.query(LostFoundPost.id).filter(LostFoundPost.owner_id == user_id).all()]

    msgs = db.query(Message).filter(
        or_(
            Message.sender_id == user_id,
            Message.recipient_id == user_id,
            Message.post_id.in_(posts_owned)
        )
    ).order_by(Message.created_at.desc()).all()

    # Group by post_id
    grouped = {}
    for m in msgs:
        pid = m.post_id or 0
        if pid not in grouped:
            post = db.query(LostFoundPost).filter(LostFoundPost.id == pid).first()
            grouped[pid] = {
                "post_id": pid,
                "dog_name": post.dog_name if post else "Pet Notice",
                "kind": post.kind if post else "lost",
                "photo": post.photo if post else None,
                "address": post.address if post else "",
                "messages": []
            }
        sender = db.query(User).filter(User.id == m.sender_id).first()
        recipient = db.query(User).filter(User.id == m.recipient_id).first()
        grouped[pid]["messages"].append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": (sender.full_name or sender.username) if sender else "Citizen",
            "recipient_id": m.recipient_id,
            "recipient_name": (recipient.full_name or recipient.username) if recipient else "Owner",
            "body": m.body,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_mine": m.sender_id == user_id
        })

    return list(grouped.values())


@lost_found_router.get("/posts/{post_id}/messages")
def get_post_messages(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = current_user.id if current_user else 1
    # Return all messages for the post so users see the conversation
    msgs = db.query(Message).filter(Message.post_id == post_id).order_by(Message.created_at.asc()).all()

    result = []
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        recipient = db.query(User).filter(User.id == m.recipient_id).first()
        result.append({
            "id": m.id,
            "post_id": m.post_id,
            "sender_id": m.sender_id,
            "sender_name": (sender.full_name or sender.username) if sender else "Citizen",
            "recipient_id": m.recipient_id,
            "recipient_name": (recipient.full_name or recipient.username) if recipient else "Owner",
            "body": m.body,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_mine": m.sender_id == user_id
        })
    return result


@lost_found_router.post("/posts/{post_id}/messages")
def send_post_message(
    post_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    body_text = data.get("body", "").strip()
    if not body_text:
        raise HTTPException(status_code=400, detail="Message body cannot be empty.")

    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = current_user.id if current_user else 1
    recipient_id = post.owner_id
    if user_id == post.owner_id:
        recipient_id = data.get("recipient_id")
        if not recipient_id:
            last_msg = db.query(Message).filter(
                Message.post_id == post_id,
                Message.sender_id != user_id
            ).order_by(Message.created_at.desc()).first()
            if last_msg:
                recipient_id = last_msg.sender_id

    msg = Message(
        post_id=post_id,
        sender_id=user_id,
        recipient_id=recipient_id,
        body=body_text,
        created_at=datetime.datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender_name = (current_user.full_name or current_user.username) if current_user else "Citizen"

    return {
        "id": msg.id,
        "post_id": msg.post_id,
        "sender_id": msg.sender_id,
        "sender_name": sender_name,
        "recipient_id": msg.recipient_id,
        "body": msg.body,
        "created_at": msg.created_at.isoformat(),
        "is_mine": True
    }


# -----------------------------------------------------------------------------
# 8. REPORT POST FOR MODERATION
# -----------------------------------------------------------------------------
@lost_found_router.post("/posts/{post_id}/report")
def report_post(
    post_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    reason = data.get("reason", "Suspicious or fake post")
    audit(
        db,
        action="report_lost_found_post",
        entity_type="lost_found_post",
        entity_id=str(post_id),
        actor_id=current_user.id,
        after={"reason": reason, "dog_name": post.dog_name, "kind": post.kind}
    )

    return {"status": "success", "message": "Post reported to NGO safety team for review."}


# -----------------------------------------------------------------------------
# 9. ARCHIVE (SOFT-DELETE) POST FOR CITIZEN
# -----------------------------------------------------------------------------
@lost_found_router.post("/posts/{post_id}/archive")
def archive_lost_found_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.is_archived = True
    db.commit()

    actor_id = current_user.id if current_user else 1
    audit(db, action="archive_post", entity_type="lost_found_post", entity_id=str(post_id), actor_id=actor_id)

    return {"status": "success", "message": f"Post #{post_id} archived successfully. It is saved in your Archived tab.", "is_archived": True}


@lost_found_router.post("/posts/{post_id}/unarchive")
def unarchive_lost_found_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.is_archived = False
    db.commit()

    actor_id = current_user.id if current_user else 1
    audit(db, action="unarchive_post", entity_type="lost_found_post", entity_id=str(post_id), actor_id=actor_id)

    return {"status": "success", "message": f"Post #{post_id} restored to active list.", "is_archived": False}


# -----------------------------------------------------------------------------
# 10. SOCIAL REMARKS / COMMENTS (Instagram Style)
# -----------------------------------------------------------------------------
@lost_found_router.get("/posts/{post_id}/remarks")
def get_post_remarks(
    post_id: int,
    db: Session = Depends(get_db)
):
    remarks = db.query(PostRemark).filter(PostRemark.post_id == post_id).order_by(PostRemark.created_at.desc()).all()
    return [{
        "id": r.id,
        "user_id": r.user_id,
        "author_name": r.author_name or "Animal Advocate",
        "comment": r.comment,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in remarks]


@lost_found_router.post("/posts/{post_id}/remarks")
def add_post_remark(
    post_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    text = data.get("comment", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Remark comment cannot be empty.")

    author = (current_user.full_name or current_user.username) if current_user else (data.get("author_name") or "Community Volunteer")
    user_id = current_user.id if current_user else None

    remark = PostRemark(
        post_id=post_id,
        user_id=user_id,
        author_name=author,
        comment=text,
        created_at=datetime.datetime.utcnow()
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)

    return {
        "id": remark.id,
        "post_id": remark.post_id,
        "author_name": remark.author_name,
        "comment": remark.comment,
        "created_at": remark.created_at.isoformat()
    }


# -----------------------------------------------------------------------------
# 11. UPVOTES & DOWNVOTES (Community Votes)
# -----------------------------------------------------------------------------
@lost_found_router.post("/posts/{post_id}/vote")
def vote_post(
    post_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    post = db.query(LostFoundPost).filter(LostFoundPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    vote_type = data.get("type", "up")  # 'up' or 'down'
    if vote_type == "up":
        post.upvotes = (post.upvotes or 0) + 1
    elif vote_type == "down":
        post.downvotes = (post.downvotes or 0) + 1

    db.commit()
    return {"status": "success", "upvotes": post.upvotes, "downvotes": post.downvotes}


# -----------------------------------------------------------------------------
# 12. CITIZEN MATCH OPINION RECORDING
# -----------------------------------------------------------------------------
@lost_found_router.post("/matches/{match_id}/opinion")
def record_citizen_opinion(
    match_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    match = db.query(LostFoundMatch).filter(LostFoundMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match pair not found")

    opinion_val = data.get("opinion", "match")  # 'match' | 'not_a_match'
    note_val = data.get("note", "")

    user_id = current_user.id if current_user else 1

    op = MatchOpinion(
        match_id=match_id,
        user_id=user_id,
        opinion=opinion_val,
        note=note_val,
        created_at=datetime.datetime.utcnow()
    )
    db.add(op)
    db.commit()

    return {
        "status": "success",
        "message": "Thank you for sharing your opinion! Our Govt / NGO officers review citizen inputs before finalizing official database records.",
        "opinion": opinion_val
    }
