with open('backend/routers/rescues_router.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """@rescues_router.patch("/{public_id}")
@complaints_router.patch("/{public_id}")
def update_complaint_status(
    public_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        # Try RescueCase for legacy support
        r = db.query(RescueCase).filter(RescueCase.ticket_id == public_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Complaint record not found")
        # Update RescueCase legacy
        st_raw = data.get("status", r.status)
        r.status = st_raw
        db.commit()
        return {"message": f"Legacy case {public_id} updated.", "status": r.status}

    if current_user.role not in ["admin", "ngo_staff", "govt_official", "volunteer"]:
        raise HTTPException(status_code=403, detail="Permission denied to update complaint status.")

    before_status = c.status

    # Normalize incoming status string
    raw_status = str(data.get("status") or "").strip()
    status_map = {
        "reported": "reported",
        "reported / pending": "reported",
        "pending dispatch": "reported",
        "acknowledged": "acknowledged",
        "team dispatched": "team_dispatched",
        "team_dispatched": "team_dispatched",
        "ambulance en route": "team_dispatched",
        "in progress": "in_progress",
        "in_progress": "in_progress",
        "admitted": "in_progress",
        "resolved": "resolved",
        "closed": "closed",
        "cancelled": "cancelled"
    }

    normalized_status = status_map.get(raw_status.lower(), raw_status.lower() or c.status)
    c.status = normalized_status

    if "urgency" in data: c.urgency = data["urgency"]
    if "issue_type" in data: c.issue_type = data["issue_type"]
    if "assigned_to" in data: c.assigned_to = data["assigned_to"]
    if "assigned_org_id" in data: c.assigned_org_id = data["assigned_org_id"]
    if "resolution_notes" in data or "note" in data:
        note_txt = data.get("resolution_notes") or data.get("note")
        c.resolution_notes = note_txt
        if normalized_status == "resolved":
            c.resolved_at = datetime.datetime.utcnow()

    c.updated_at = datetime.datetime.utcnow()
    db.commit()

    # Append timeline ComplaintEvent
    note_msg = data.get("note") or data.get("resolution_notes") or f"Status updated to {normalized_status.replace('_', ' ').title()}"
    ev = ComplaintEvent(
        complaint_id=c.id,
        status=normalized_status,
        note=note_msg,
        actor_id=current_user.id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(ev)
    db.commit()

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
# 6. DELETE COMPLAINT (Admin / NGO Staff Audit Logged)
# -----------------------------------------------------------------------------
@rescues_router.delete("/{public_id}")
@complaints_router.delete("/{public_id}")
def delete_complaint(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "ngo_staff", "govt_official"]:
        raise HTTPException(status_code=403, detail="Permission denied to delete complaints.")

    c = db.query(Complaint).filter((Complaint.public_id == public_id) | (Complaint.id == (int(public_id) if public_id.isdigit() else -1))).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    db.query(ComplaintEvent).filter(ComplaintEvent.complaint_id == c.id).delete(synchronize_session=False)
    db.delete(c)
    db.commit()

    audit(db=db, actor_id=current_user.id, action="delete_complaint", entity_type="complaint", entity_id=public_id)

    return {"status": "success", "message": f"Complaint {public_id} deleted."}"""

new_block = """@rescues_router.patch("/{public_id}")
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

    return {"status": "success", "message": f"Complaint {public_id} deleted."}"""

normalized_text = text.replace('\r\n', '\n')
if old_block in normalized_text:
    normalized_text = normalized_text.replace(old_block, new_block)
    with open('backend/routers/rescues_router.py', 'w', encoding='utf-8') as f:
        f.write(normalized_text)
    print("SUCCESS")
else:
    print("NOT FOUND")
