import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.incidents import Incident
from app.models.alerts import AlertDraft
from app.agents.agent_d_communication import CommunicationAgent
from app.services.audit_service import audit_service

router = APIRouter()
agent_d = CommunicationAgent(settings)


def alert_to_dict(a: AlertDraft) -> dict:
    return {
        "id": a.id,
        "incident_id": a.incident_id,
        "content_en": a.content_en or "",
        "content_hi": a.content_hi or "",
        "content_mr": a.content_mr or "",
        "status": a.status,
        "created_by": a.created_by or "",
        "approved_by": a.approved_by,
        "approved_at": a.approved_at.isoformat() if a.approved_at else None,
        "publication_note": a.publication_note or "",
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


@router.get("")
def list_alerts(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(AlertDraft)
    if status:
        q = q.filter(AlertDraft.status == status)
    total = q.count()
    items = q.order_by(AlertDraft.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [alert_to_dict(a) for a in items], "total": total, "page": page}


@router.post("/draft", status_code=201)
def create_draft(data: dict, db: Session = Depends(get_db)):
    incident_id = data.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=422, detail="incident_id is required")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident_dict = {
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "address": incident.address or "",
        "description": incident.description or "",
        "data_confidence": incident.data_confidence,
        "is_demo": incident.is_demo,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "affected_population": incident.affected_population,
    }

    draft_result = agent_d.draft_alert(incident_dict)

    alert = AlertDraft(
        id=str(uuid.uuid4()),
        incident_id=incident_id,
        content_en=draft_result.get("en", ""),
        content_hi=draft_result.get("hi", ""),
        content_mr=draft_result.get("mr", ""),
        status="draft",
        created_by=data.get("created_by", "operator"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    audit_service.log(
        db, actor=data.get("created_by", "operator"), action="alert_draft_created",
        entity_type="alert", entity_id=alert.id,
        new_value={"incident_id": incident_id, "method": draft_result.get("method", "")},
        is_demo=incident.is_demo,
    )

    result = alert_to_dict(alert)
    result["warnings"] = draft_result.get("warnings", [])
    result["method"] = draft_result.get("method", "")
    return result


@router.post("/{alert_id}/approve")
def approve_alert(alert_id: str, data: dict, db: Session = Depends(get_db)):
    alert = db.query(AlertDraft).filter(AlertDraft.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert draft not found")

    decision = data.get("decision")
    if decision not in ("approved", "rejected", "published"):
        raise HTTPException(status_code=422, detail="decision must be 'approved', 'rejected', or 'published'")

    decided_by = data.get("decided_by", "operator")
    note = data.get("note", "")

    old_status = alert.status
    alert.status = decision
    alert.approved_by = decided_by
    alert.approved_at = datetime.utcnow()
    alert.publication_note = note
    alert.updated_at = datetime.utcnow()
    db.commit()

    audit_service.log(
        db, actor=decided_by, action=f"alert_{decision}",
        entity_type="alert", entity_id=alert_id,
        old_value={"status": old_status},
        new_value={"status": decision, "note": note},
        reason=note,
    )

    message = {
        "approved": "Alert approved. Simulated local publication for demo. ⚠️ No real broadcasting in this prototype.",
        "rejected": f"Alert rejected: {note}",
        "published": "Alert marked as published (local simulation only). No real emergency broadcast.",
    }.get(decision, "Status updated.")

    return {**alert_to_dict(alert), "message": message}


@router.patch("/{alert_id}")
def update_alert(alert_id: str, data: dict, db: Session = Depends(get_db)):
    alert = db.query(AlertDraft).filter(AlertDraft.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert draft not found")
    if alert.status not in ("draft",):
        raise HTTPException(status_code=409, detail="Only draft alerts can be edited")
    for field in ["content_en", "content_hi", "content_mr"]:
        if field in data:
            setattr(alert, field, data[field])
    alert.updated_at = datetime.utcnow()
    db.commit()
    return alert_to_dict(alert)
