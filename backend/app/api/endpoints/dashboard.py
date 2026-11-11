from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.incidents import Incident
from app.models.resources import Resource, ResourceRecommendation
from app.models.audit import AuditEvent

router = APIRouter()


@router.get("")
@router.get("/summary")
def get_dashboard(db: Session = Depends(get_db)):
    total_incidents = db.query(func.count(Incident.id)).scalar() or 0
    active_incidents = (
        db.query(func.count(Incident.id))
        .filter(Incident.status.notin_(["resolved", "closed"]))
        .scalar() or 0
    )
    critical_incidents = (
        db.query(func.count(Incident.id))
        .filter(Incident.priority_level == "critical")
        .scalar() or 0
    )
    available_resources = (
        db.query(func.count(Resource.id))
        .filter(Resource.status == "available")
        .scalar() or 0
    )
    pending_approvals = (
        db.query(func.count(ResourceRecommendation.id))
        .filter(ResourceRecommendation.status == "pending")
        .scalar() or 0
    )

    # Incidents by severity
    severity_rows = (
        db.query(Incident.severity, func.count(Incident.id))
        .group_by(Incident.severity)
        .all()
    )
    incidents_by_severity = {str(s): c for s, c in severity_rows if s is not None}

    # Incidents by type
    type_rows = (
        db.query(Incident.incident_type, func.count(Incident.id))
        .group_by(Incident.incident_type)
        .all()
    )
    incidents_by_type = {t: c for t, c in type_rows if t is not None}

    # Recent incidents (last 5)
    recent_incidents = (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .limit(5)
        .all()
    )
    recent_incidents_data = [
        {
            "id": i.id,
            "title": i.title,
            "incident_type": i.incident_type,
            "severity": i.severity,
            "priority_level": i.priority_level,
            "status": i.status,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in recent_incidents
    ]

    # Recent audit events (last 5)
    recent_audit = (
        db.query(AuditEvent)
        .order_by(AuditEvent.timestamp.desc())
        .limit(5)
        .all()
    )
    recent_audit_data = [
        {
            "id": a.id,
            "actor": a.actor,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in recent_audit
    ]

    return {
        "total_incidents": total_incidents,
        "active_incidents": active_incidents,
        "critical_incidents": critical_incidents,
        "available_resources": available_resources,
        "pending_approvals": pending_approvals,
        "incidents_by_severity": incidents_by_severity,
        "incidents_by_type": incidents_by_type,
        "recent_incidents": recent_incidents_data,
        "recent_audit": recent_audit_data,
    }
