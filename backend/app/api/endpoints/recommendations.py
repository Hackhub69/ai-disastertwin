import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.incidents import Incident
from app.models.resources import Resource, ResourceRecommendation
from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
from app.services.audit_service import audit_service

router = APIRouter()
agent_c = DispatchResourceAgent(settings)


@router.post("")
def generate_recommendations(data: dict, db: Session = Depends(get_db)):
    incident_id = data.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=422, detail="incident_id is required")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    resources = db.query(Resource).filter(Resource.status == "available").all()
    resources_data = [
        {
            "id": r.id, "name": r.name, "resource_type": r.resource_type,
            "latitude": r.latitude, "longitude": r.longitude,
            "status": r.status, "capacity": r.capacity, "current_load": r.current_load,
        }
        for r in resources
    ]

    incident_data = {
        "id": incident.id, "incident_type": incident.incident_type,
        "latitude": incident.latitude, "longitude": incident.longitude,
        "severity": incident.severity, "priority_level": incident.priority_level,
    }

    result = agent_c.generate_recommendations(incident_data, resources_data)
    candidates = result.get("candidates", [])

    # Persist recommendations
    saved = []
    for cand in candidates:
        rec = ResourceRecommendation(
            id=str(uuid.uuid4()),
            incident_id=incident_id,
            resource_id=cand["resource"]["id"],
            recommendation_score=cand.get("score", 0),
            distance_km=cand.get("distance_km", 0),
            reasoning=cand.get("reasoning", ""),
            status="pending",
            recommended_at=datetime.utcnow(),
        )
        db.add(rec)
        saved.append({
            "id": rec.id,
            "resource_id": rec.resource_id,
            "resource_name": cand["resource"]["name"],
            "resource_type": cand["resource"]["resource_type"],
            "recommendation_score": rec.recommendation_score,
            "distance_km": rec.distance_km,
            "reasoning": rec.reasoning,
            "status": rec.status,
        })

    db.commit()
    audit_service.log(
        db, actor="system", action="recommendations_generated",
        entity_type="incident", entity_id=incident_id,
        new_value={"count": len(saved), "method": result.get("method", "")},
        is_demo=incident.is_demo,
    )
    return {
        "incident_id": incident_id,
        "candidates": saved,
        "total_available": result.get("total_available", len(resources)),
        "conflicts": result.get("conflicts", []),
        "method": result.get("method", "DispatchResourceAgent"),
    }
