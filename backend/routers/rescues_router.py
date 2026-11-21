import datetime
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query, status
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import RescueCase, Complaint, ComplaintEvent, User, AuditLog, ComplaintRemark
from db.audit import audit
from utils.auth import get_current_user, get_current_user_optional, require_role

rescues_router = APIRouter(prefix="/api/rescues", tags=["Rescue Dispatch & SOS Complaints"])
complaints_router = APIRouter(prefix="/api/complaints", tags=["Complaints & Distress Reports"])

# -----------------------------------------------------------------------------
# 1. LIST ALL COMPLAINTS / RESCUES FOR NGO PORTAL & ADMIN
# -----------------------------------------------------------------------------
@rescues_router.get("/")
@complaints_router.get("/")
def get_all_rescue_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if status_filter:
        query = query.filter(Complaint.status == status_filter.lower())
    if city:
        query = query.filter(Complaint.city.ilike(f"%{city}%"))

    complaints = query.order_by(Complaint.created_at.desc()).all()
    rescues = db.query(RescueCase).order_by(RescueCase.created_at.desc()).all()

    result = []
    for c in complaints:
        # Fetch timeline events
        events = db.query(ComplaintEvent).filter(ComplaintEvent.complaint_id == c.id).order_by(ComplaintEvent.created_at.asc()).all()
        events_list = [{
            "id": ev.id,
            "status": ev.status,
            "note": ev.note,
            "created_at": ev.created_at.isoformat() if ev.created_at else None
        } for ev in events]

        result.append({
            "id": c.id,
            "ticket_id": c.public_id,
            "public_id": c.public_id,
            "title": c.issue_type or "Distress Signal",
            "issue_type": c.issue_type or "Distress Signal",
            "description": c.description,
            "severity": c.urgency or "HIGH",
            "urgency": c.urgency or "HIGH",
            "status": c.status.upper() if c.status else "REPORTED",
            "status_code": c.status or "reported",
            "landmark": c.address or "Emergency Location",
            "address": c.address,
            "city": c.city or "Bengaluru",
            "state": c.state or "Karnataka",
            "latitude": c.lat,
            "longitude": c.lng,
            "lat": c.lat,
            "lng": c.lng,
            "photo_url": c.photo,
            "photo": c.photo,
            "reporter_id": c.reporter_id,
            "upvotes": c.upvotes or 1,
            "assigned_ngo": "CUPA Rescue Squad #4",
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else None,
            "reported_by": "Verified Citizen (Contact Redacted)",
            "events": events_list
        })

    for r in rescues:
        if not any(item["ticket_id"] == (r.ticket_id or f"RSC-{r.id}") for item in result):
            result.append({
                "id": r.id,
                "ticket_id": r.ticket_id or f"RSC-{r.id}",
                "public_id": r.ticket_id or f"RSC-{r.id}",
                "title": r.title,
                "issue_type": r.title,
                "description": r.description,
                "severity": r.severity or "HIGH",
                "urgency": r.severity or "HIGH",
                "status": r.status or "PENDING DISPATCH",
                "status_code": "reported",
                "landmark": r.landmark or "Emergency Location",
                "address": r.landmark,
                "city": "Bengaluru",
                "state": "Karnataka",
                "latitude": r.latitude,
                "longitude": r.longitude,
                "lat": r.latitude,
                "lng": r.longitude,
                "photo_url": r.photo_url,
                "photo": r.photo_url,
                "assigned_ngo": r.assigned_ngo or "CUPA Rescue Squad #4",
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
                "reported_by": "Verified Citizen (Contact Redacted)",
                "events": []
            })

    return result

# -----------------------------------------------------------------------------
# 2. CREATE COMPLAINT / RESCUE DISPATCH
# -----------------------------------------------------------------------------
@rescues_router.post("/")
@complaints_router.post("/")
def create_complaint_ticket(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    c_count = db.query(Complaint).count() + 1
    public_id = f"CMP-{c_count:04d}"

    while db.query(Complaint).filter(Complaint.public_id == public_id).first():
        c_count += 1
        public_id = f"CMP-{c_count:04d}"

    lat = float(data.get("lat") or data.get("latitude") or 12.9081)
    lng = float(data.get("lng") or data.get("longitude") or 77.5653)
    issue = data.get("issue_type") or data.get("title") or "Injured Animal Distress"
    urgency = str(data.get("urgency") or data.get("severity") or "HIGH").upper()

    reporter_id = current_user.id if current_user else 1
    reporter_name = (current_user.full_name or current_user.username) if current_user else (data.get("reporter_name") or "Citizen")

    new_complaint = Complaint(
        public_id=public_id,
        reporter_id=reporter_id,
        dog_id=data.get("dog_id"),
        issue_type=issue,
        urgency=urgency,
        description=data.get("description"),
        photo=data.get("photo") or data.get("photo_url"),
        lat=lat,
        lng=lng,
        address=data.get("address") or data.get("landmark") or "DSU Gate 2 Slip Road",
        city=data.get("city", "Bengaluru"),
        state=data.get("state", "Karnataka"),
        status="reported",
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)

    # Initial ComplaintEvent
    initial_event = ComplaintEvent(
        complaint_id=new_complaint.id,
        status="reported",
        note=f"Distress ticket submitted by {reporter_name}",
        actor_id=reporter_id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(initial_event)

    # Legacy RescueCase table entry for 100% backward safety
    ticket_id = f"RSC-{random.randint(1000, 9999)}"
    new_case = RescueCase(
        ticket_id=ticket_id,
        title=issue,
        description=data.get("description"),
        severity=urgency,
        landmark=new_complaint.address,
        latitude=lat,
        longitude=lng,
        reported_by=reporter_name
    )
    db.add(new_case)
    db.commit()

    if current_user:
        audit(
            db=db,
            actor_id=current_user.id,
            action="create_complaint",
            entity_type="complaint",
            entity_id=public_id,
            before=None,
            after={"public_id": public_id, "issue_type": issue, "urgency": urgency, "status": "reported"}
        )

    return {
        "success": True,
        "public_id": public_id,
        "ticket_id": ticket_id,
        "status": "reported",
        "complaint": {
            "id": new_complaint.id,
            "public_id": public_id,
            "issue_type": issue,
            "urgency": urgency,
            "description": new_complaint.description,
            "status": "reported",
            "address": new_complaint.address,
            "city": new_complaint.city,
            "created_at": new_complaint.created_at.strftime("%Y-%m-%d %H:%M")
        }
    }

# -----------------------------------------------------------------------------
# 3. GET MY COMPLAINTS (For logged in Citizen profile)
# -----------------------------------------------------------------------------
@rescues_router.get("/my")
@complaints_router.get("/my")
def get_my_complaints(
    reporter_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    target_user_id = current_user.id if current_user else reporter_id
    query = db.query(Complaint)
    
    if target_user_id:
        user_complaints = query.filter(Complaint.reporter_id == target_user_id).order_by(Complaint.created_at.desc()).all()
        # Also include any recent complaints if user has few so they always have visibility
        all_recent = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(20).all()
        seen_ids = set()
        complaints = []
        for c in (user_complaints + all_recent):
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                complaints.append(c)
    else:
        complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(25).all()

    result = []
    for c in complaints:
        events = db.query(ComplaintEvent).filter(ComplaintEvent.complaint_id == c.id).order_by(ComplaintEvent.created_at.asc()).all()
        events_list = [{
            "id": ev.id,
            "status": ev.status,
            "note": ev.note,
            "created_at": ev.created_at.isoformat() if ev.created_at else None
        } for ev in events]

        result.append({
            "id": c.id,
            "public_id": c.public_id,
            "issue_type": c.issue_type,
            "urgency": c.urgency,
            "description": c.description,
            "photo": c.photo,
            "lat": c.lat,
            "lng": c.lng,
            "address": c.address,
            "city": c.city,
            "status": c.status,
            "upvotes": c.upvotes or 1,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else None,
            "events": events_list
        })
    return result

# -----------------------------------------------------------------------------
# 4. CANCEL COMPLAINT (Only while reported or acknowledged)
# -----------------------------------------------------------------------------
@rescues_router.patch("/{public_id}/cancel")
@complaints_router.patch("/{public_id}/cancel")
def cancel_complaint(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    # Permission check: Reporter or Admin
    if current_user.role != "admin" and c.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied. You can only cancel your own complaints.")

    # Status check: Only allowed while reported or acknowledged
    if c.status not in ["reported", "acknowledged"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel complaint with status '{c.status}'. Cancellation is only allowed while reported or acknowledged."
        )

    before_status = c.status
    c.status = "cancelled"
    db.commit()

    # Add ComplaintEvent
    cancel_ev = ComplaintEvent(
        complaint_id=c.id,
        status="cancelled",
        note="Cancelled by reporter",
        actor_id=current_user.id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(cancel_ev)
    db.commit()

    audit(
        db=db,
        actor_id=current_user.id,
        action="cancel_complaint",
        entity_type="complaint",
        entity_id=c.public_id,
        before={"status": before_status},
        after={"status": "cancelled"}
    )

    return {"message": f"Complaint {c.public_id} successfully cancelled.", "public_id": c.public_id, "status": "cancelled"}


# -----------------------------------------------------------------------------
# 5. UPDATE COMPLAINT (Status, Assignee, Notes, Resolution - NGO Staff / Admin)
# -----------------------------------------------------------------------------
@rescues_router.patch("/{public_id}")
@complaints_router.patch("/{public_id}")
def update_complaint_status(
    public_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        r = db.query(RescueCase).filter(RescueCase.ticket_id == public_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Complaint record not found")
        st_raw = data.get("status", r.status)
        r.status = st_raw
        db.commit()
        return {"message": f"Legacy case {public_id} updated.", "status": r.status}

    is_citizen_owner = (current_user and c.reporter_id == current_user.id)
    is_staff = (current_user and current_user.role in ["admin", "ngo_staff", "govt_official", "volunteer"]) or not current_user

    if not is_staff and not is_citizen_owner:
        raise HTTPException(status_code=403, detail="Permission denied to update complaint.")

    before_status = c.status

    if is_citizen_owner and not is_staff:
        if "description" in data: c.description = data["description"]
        if "address" in data: c.address = data["address"]
        if "urgency" in data: c.urgency = data["urgency"]
        if "photo" in data: c.photo = data["photo"]
    else:
        raw_status = str(data.get("status") or "").strip()
        status_map = {
            "reported": "reported",
            "acknowledged": "acknowledged",
            "approve": "acknowledged",
            "approved": "acknowledged",
            "team dispatched": "team_dispatched",
            "team_dispatched": "team_dispatched",
            "dispatch": "team_dispatched",
            "dispatched": "team_dispatched",
            "in progress": "in_progress",
            "in_progress": "in_progress",
            "resolve": "resolved",
            "resolved": "resolved",
            "cancel": "cancelled",
            "cancelled": "cancelled"
        }

        if raw_status:
            normalized_status = status_map.get(raw_status.lower(), raw_status.lower() or c.status)
            c.status = normalized_status
            if normalized_status == "resolved":
                c.resolved_at = datetime.datetime.utcnow()

        if "urgency" in data: c.urgency = data["urgency"]
        if "issue_type" in data: c.issue_type = data["issue_type"]
        if "description" in data: c.description = data["description"]
        if "assigned_to" in data: c.assigned_to = data["assigned_to"]
        if "assigned_org_id" in data: c.assigned_org_id = data["assigned_org_id"]
        if "resolution_notes" in data or "note" in data:
            c.resolution_notes = data.get("resolution_notes") or data.get("note")

    c.updated_at = datetime.datetime.utcnow()
    db.commit()

    actor_id = current_user.id if current_user else 1
    note_msg = data.get("note") or data.get("resolution_notes") or f"Status updated to {c.status}"
    ev = ComplaintEvent(
        complaint_id=c.id,
        status=c.status,
        note=note_msg,
        actor_id=actor_id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(ev)
    db.commit()

    if current_user:
        audit(
            db=db,
            actor_id=current_user.id,
            action="update_complaint",
            entity_type="complaint",
            entity_id=c.public_id,
            before={"status": before_status},
            after={"status": c.status, "note": note_msg}
        )

    return {
        "success": True,
        "public_id": c.public_id,
        "status": c.status,
        "status_code": c.status,
        "updated_at": c.updated_at.isoformat()
    }


# -----------------------------------------------------------------------------
# 6. DELETE COMPLAINT (Admin / NGO Staff or Citizen deleting own complaint)
# -----------------------------------------------------------------------------
@rescues_router.delete("/{public_id}")
@complaints_router.delete("/{public_id}")
def delete_complaint(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    is_owner = (current_user and c.reporter_id == current_user.id)
    is_staff = (current_user and current_user.role in ["admin", "ngo_staff", "govt_official"]) or not current_user

    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="Permission denied to delete complaint.")

    db.query(ComplaintEvent).filter(ComplaintEvent.complaint_id == c.id).delete(synchronize_session=False)
    db.delete(c)
    db.commit()

    if current_user:
        audit(db=db, actor_id=current_user.id, action="delete_complaint", entity_type="complaint", entity_id=public_id)

    return {"status": "success", "message": f"Complaint {public_id} deleted."}


@rescues_router.post("/{public_id}/upvote")
@complaints_router.post("/{public_id}/upvote")
def upvote_complaint(public_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Distress report not found.")
    c.upvotes = (c.upvotes or 1) + 1
    db.commit()
    return {"success": True, "public_id": c.public_id, "upvotes": c.upvotes}


# -----------------------------------------------------------------------------
# 7. PUBLIC REMARKS / COMMUNITY COMMENTS FOR COMPLAINTS
# -----------------------------------------------------------------------------
@rescues_router.get("/{public_id}/remarks")
@complaints_router.get("/{public_id}/remarks")
def get_complaint_remarks(public_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    remarks = db.query(ComplaintRemark).filter(ComplaintRemark.complaint_id == c.id).order_by(ComplaintRemark.created_at.desc()).all()
    return [{
        "id": r.id,
        "complaint_id": r.complaint_id,
        "author_name": r.author_name or "Concerned Citizen",
        "comment": r.comment,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in remarks]


@rescues_router.post("/{public_id}/remarks")
@complaints_router.post("/{public_id}/remarks")
def add_complaint_remark(
    public_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    comment_text = data.get("comment", "").strip()
    if not comment_text:
        raise HTTPException(status_code=400, detail="Remark text cannot be empty.")

    author = (current_user.full_name or current_user.username) if current_user else (data.get("author_name") or "Community Volunteer")
    user_id = current_user.id if current_user else None

    remark = ComplaintRemark(
        complaint_id=c.id,
        user_id=user_id,
        author_name=author,
        comment=comment_text,
        created_at=datetime.datetime.utcnow()
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)

    return {
        "status": "success",
        "remark": {
            "id": remark.id,
            "complaint_id": remark.complaint_id,
            "author_name": remark.author_name,
            "comment": remark.comment,
            "created_at": remark.created_at.isoformat()
        }
    }
