import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from db.database import get_db
from db.models import Dog, Complaint, ComplaintEvent, User
from utils.auth import get_current_user_optional

analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics & Welfare Insights"])

@analytics_router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    total_dogs = db.query(Dog).filter(Dog.deleted_at.is_(None)).count()
    open_statuses = ["reported", "acknowledged", "team_dispatched", "in_progress"]
    open_complaints = db.query(Complaint).filter(Complaint.status.in_(open_statuses)).count()

    # Calculate actual disease counts from registered dogs
    disease_count = db.query(Dog).filter(
        Dog.deleted_at.is_(None),
        Dog.disease_name.isnot(None),
        ~Dog.disease_name.ilike("%normal%")
    ).count()

    healthy_count = total_dogs - disease_count

    return {
        "dogs_registered": total_dogs,
        "healthy_dogs": healthy_count,
        "diseased_or_trauma_dogs": disease_count,
        "open_complaints": open_complaints,
        "disease_rate_pct": round((disease_count / total_dogs * 100), 1) if total_dogs > 0 else 0.0,
        "trends": {
            "dogs_registered": f"{total_dogs} total verified dogs in registry",
            "open_complaints": f"{open_complaints} active incident tickets",
            "health_ratio": f"{round((healthy_count / total_dogs * 100), 1) if total_dogs > 0 else 0}% healthy dogs"
        }
    }

@analytics_router.get("/charts")
def get_analytics_charts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # 1. Real Breed Distribution from actual registered dogs
    breed_data = db.query(Dog.breed, func.count(Dog.id))\
        .filter(Dog.deleted_at.is_(None))\
        .group_by(Dog.breed)\
        .order_by(func.count(Dog.id).desc())\
        .all()
    
    breed_dist = [{"breed": b[0] or "Indian Pariah / Indie", "count": b[1]} for b in breed_data]

    # 2. Real Location Distribution
    loc_data = db.query(Dog.location, func.count(Dog.id))\
        .filter(Dog.deleted_at.is_(None))\
        .group_by(Dog.location)\
        .order_by(func.count(Dog.id).desc())\
        .all()
    
    location_dist = [{"location": l[0] or "Bengaluru", "count": l[1]} for l in loc_data]

    # 3. Real Disease Breakdown
    disease_data = db.query(Dog.disease_name, func.count(Dog.id))\
        .filter(Dog.deleted_at.is_(None))\
        .group_by(Dog.disease_name)\
        .order_by(func.count(Dog.id).desc())\
        .all()

    disease_dist = [{"disease": d[0] or "Normal / No visible disease", "count": d[1]} for d in disease_data]

    # 4. Location vs Disease Cross-Analysis (Which area has more diseases)
    area_disease_data = db.query(Dog.location, Dog.disease_name, func.count(Dog.id))\
        .filter(
            Dog.deleted_at.is_(None),
            Dog.disease_name.isnot(None),
            ~Dog.disease_name.ilike("%normal%")
        )\
        .group_by(Dog.location, Dog.disease_name)\
        .order_by(func.count(Dog.id).desc())\
        .all()

    area_disease_hotspots = [
        {"location": row[0], "disease": row[1], "cases": row[2]} for row in area_disease_data
    ]

    # 5. Location vs Accidents / Distress Complaints
    accident_data = db.query(Complaint.address, Complaint.issue_type, func.count(Complaint.id))\
        .group_by(Complaint.address, Complaint.issue_type)\
        .order_by(func.count(Complaint.id).desc())\
        .limit(10)\
        .all()

    accident_hotspots = [
        {"location": row[0], "issue": row[1], "count": row[2]} for row in accident_data
    ]

    return {
        "breed_distribution": breed_dist,
        "location_distribution": location_dist,
        "disease_distribution": disease_dist,
        "area_disease_hotspots": area_disease_hotspots,
        "accident_hotspots": accident_hotspots
    }
