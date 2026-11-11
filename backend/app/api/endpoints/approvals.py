from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.resources import Resource, ResourceRecommendation
from app.services.audit_service import audit_service

router = APIRouter()


@router.post("")
def process_approval(data: dict, db: Session = Depends(get_db)):
    rec_id = data.get("recommendation_id")
    decision = data.get("decision")
    decided_by = data.get("decided_by", "operator")
    reason = data.get("reason", "")

    if not rec_id:
        raise HTTPException(status_code=422, detail="recommendation_id is required")
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="decision must be 'approved' or 'rejected'")

    rec = db.query(ResourceRecommendation).filter(ResourceRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if rec.status != "pending":
        raise HTTPException(status_code=409, detail=f"Recommendation already {rec.status}")

    old_status = rec.status
    rec.status = decision
    rec.decided_at = datetime.utcnow()
    rec.decided_by = decided_by
    rec.rejection_reason = reason if decision == "rejected" else None

    # If approved, mark resource as deployed (human verified — no auto-dispatch)
    if decision == "approved":
        resource = db.query(Resource).filter(Resource.id == rec.resource_id).first()
        if resource and resource.status == "available":
            resource.status = "deployed"
            resource.last_updated = datetime.utcnow()

    db.commit()

    audit_service.log(
        db, actor=decided_by, action=f"recommendation_{decision}",
        entity_type="recommendation", entity_id=rec_id,
        old_value={"status": old_status},
        new_value={"status": decision, "decided_by": decided_by, "reason": reason},
        reason=reason,
    )

    return {
        "recommendation_id": rec_id,
        "status": rec.status,
        "decided_by": decided_by,
        "decided_at": rec.decided_at.isoformat(),
        "reason": reason,
        "message": (
            "Recommendation approved. Resource marked as deployed. "
            "⚠️ No automatic dispatch occurs — human coordination required."
            if decision == "approved"
            else f"Recommendation rejected: {reason}"
        ),
    }
