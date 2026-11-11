import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.config import settings
from app.models.incidents import Incident
from app.models.resources import Resource, ResourceRecommendation
from app.models.audit import AuditEvent
from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
from app.agents.agent_b_triage_risk import TriageRiskAgent
from app.services.audit_service import audit_service

router = APIRouter()
agent_a = AlertMonitoringAgent(settings)
agent_b = TriageRiskAgent(settings)


def incident_to_dict(i: Incident) -> dict:
    return {
        "id": i.id,
        "title": i.title,
        "description": i.description,
        "incident_type": i.incident_type,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "address": i.address or "",
        "severity": i.severity,
        "priority_score": i.priority_score,
        "priority_level": i.priority_level,
        "status": i.status,
        "source_type": i.source_type,
        "is_demo": i.is_demo,
        "is_synthetic": i.is_synthetic,
        "data_confidence": i.data_confidence,
        "affected_population": i.affected_population,
        "reporter_name": i.reporter_name or "",
        "reporter_contact": i.reporter_contact or "",
        "agent_notes": i.agent_notes,
        "score_components": i.score_components,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        "triaged_at": i.triaged_at.isoformat() if i.triaged_at else None,
        "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
    }


@router.get("")
def list_incidents(
    status: str = Query(None),
    priority_level: str = Query(None),
    incident_type: str = Query(None),
    is_demo: bool = Query(None),
    is_synthetic: bool = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if priority_level:
        q = q.filter(Incident.priority_level == priority_level)
    if incident_type:
        q = q.filter(Incident.incident_type == incident_type)
    if is_demo is not None:
        q = q.filter(Incident.is_demo == is_demo)
    if is_synthetic is not None:
        q = q.filter(Incident.is_synthetic == is_synthetic)
    if search:
        q = q.filter(or_(
            Incident.title.ilike(f"%{search}%"),
            Incident.description.ilike(f"%{search}%"),
            Incident.address.ilike(f"%{search}%"),
        ))
    total = q.count()
    items = q.order_by(Incident.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [incident_to_dict(i) for i in items], "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_incident(data: dict, db: Session = Depends(get_db)):
    # Agent A: validate & normalize
    existing = [incident_to_dict(i) for i in db.query(Incident).order_by(Incident.created_at.desc()).limit(50).all()]
    result = agent_a.process_report(data, existing)
    if not result["success"]:
        raise HTTPException(status_code=422, detail={"errors": result["errors"], "warnings": result.get("warnings", [])})

    normalized = result["normalized_data"]
    # Agent B: triage
    triage = agent_b.triage(normalized)

    incident = Incident(
        id=str(uuid.uuid4()),
        title=normalized.get("title", ""),
        description=normalized.get("description", ""),
        incident_type=normalized.get("incident_type", "other"),
        latitude=normalized["latitude"],
        longitude=normalized["longitude"],
        address=normalized.get("address", ""),
        severity=normalized.get("severity", 3),
        priority_score=triage["score"],
        priority_level=triage["priority_level"],
        status="triaged",
        source_type=normalized.get("source_type", "manual"),
        is_demo=normalized.get("is_demo", True),
        is_synthetic=normalized.get("is_synthetic", False),
        data_confidence=normalized.get("data_confidence", 1.0),
        affected_population=normalized.get("affected_population"),
        reporter_name=normalized.get("reporter_name", ""),
        reporter_contact=normalized.get("reporter_contact", ""),
        agent_notes=json.dumps({
            "summary": result.get("summary", ""),
            "potential_duplicates": result.get("potential_duplicates", []),
            "validation_warnings": result["validation"].get("warnings", []),
            "triage_explanation": triage.get("explanation", ""),
        }),
        score_components=json.dumps(triage.get("components", {})),
        triaged_at=datetime.utcnow(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    audit_service.log(
        db, actor="system", action="incident_created",
        entity_type="incident", entity_id=incident.id,
        new_value={"title": incident.title, "priority_level": incident.priority_level},
        is_demo=incident.is_demo,
    )
    return incident_to_dict(incident)


@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident_to_dict(incident)


@router.patch("/{incident_id}")
def update_incident(incident_id: str, data: dict, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_vals = {"status": incident.status, "priority_level": incident.priority_level}
    allowed = ["status", "priority_level", "severity", "description", "address",
               "affected_population", "reporter_name", "reporter_contact", "data_confidence"]
    for field in allowed:
        if field in data:
            setattr(incident, field, data[field])

    if "priority_level" in data and data["priority_level"] != old_vals["priority_level"]:
        # Manual override — re-record components with override flag
        notes = json.loads(incident.agent_notes or "{}")
        notes["manual_priority_override"] = {
            "by": data.get("actor", "operator"),
            "reason": data.get("reason", ""),
            "new_level": data["priority_level"],
            "at": datetime.utcnow().isoformat(),
        }
        incident.agent_notes = json.dumps(notes)

    incident.updated_at = datetime.utcnow()
    if data.get("status") in ("resolved", "closed"):
        incident.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(incident)

    audit_service.log(
        db, actor=data.get("actor", "operator"), action="incident_updated",
        entity_type="incident", entity_id=incident_id,
        old_value=old_vals,
        new_value={k: data[k] for k in allowed if k in data},
        reason=data.get("reason", ""),
        is_demo=incident.is_demo,
    )
    return incident_to_dict(incident)


@router.post("/{incident_id}/triage")
def retriage_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    triage = agent_b.triage(incident_to_dict(incident))
    old_level = incident.priority_level
    incident.priority_score = triage["score"]
    incident.priority_level = triage["priority_level"]
    incident.score_components = json.dumps(triage.get("components", {}))
    incident.triaged_at = datetime.utcnow()
    incident.updated_at = datetime.utcnow()

    notes = json.loads(incident.agent_notes or "{}")
    notes["triage_explanation"] = triage.get("explanation", "")
    incident.agent_notes = json.dumps(notes)

    db.commit()
    audit_service.log(
        db, actor="system", action="incident_retriaged",
        entity_type="incident", entity_id=incident_id,
        old_value={"priority_level": old_level},
        new_value={"priority_level": triage["priority_level"], "score": triage["score"]},
        is_demo=incident.is_demo,
    )
    return {"incident_id": incident_id, **triage}
