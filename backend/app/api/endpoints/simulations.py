import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.incidents import Incident
from app.models.simulations import SimulationSession, SimulationEvent
from app.agents.agent_b_triage_risk import TriageRiskAgent
from app.simulations.engine import SimulationEngine
from app.services.audit_service import audit_service

router = APIRouter()
agent_b = TriageRiskAgent(settings)


@router.post("", status_code=201)
def create_simulation(data: dict, db: Session = Depends(get_db)):
    scenario_type = data.get("scenario_type", "urban_flooding")
    intensity = float(data.get("intensity", 0.5))
    num_locations = int(data.get("num_locations", 5))
    num_resources = int(data.get("num_resources", 3))

    valid_scenarios = ["urban_flooding", "heavy_rainfall", "heatwave", "wildfire"]
    if scenario_type not in valid_scenarios:
        raise HTTPException(status_code=422, detail=f"scenario_type must be one of {valid_scenarios}")
    intensity = max(0.1, min(1.0, intensity))
    num_locations = max(1, min(20, num_locations))

    session = SimulationSession(
        id=str(uuid.uuid4()),
        name=data.get("name") or f"Simulation — {scenario_type.replace('_', ' ').title()}",
        scenario_type=scenario_type,
        intensity=intensity,
        num_locations=num_locations,
        num_resources=num_resources,
        status="running",
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        config=json.dumps(data),
    )
    db.add(session)
    db.commit()

    # Generate synthetic incidents
    engine = SimulationEngine(seed=42)
    incidents_data = engine.generate_incidents(scenario_type, intensity, num_locations, session.id)

    created_incidents = []
    for inc_data in incidents_data:
        triage = agent_b.triage(inc_data)
        incident = Incident(
            id=inc_data["id"],
            title=inc_data["title"],
            description=inc_data["description"],
            incident_type=inc_data["incident_type"],
            latitude=inc_data["latitude"],
            longitude=inc_data["longitude"],
            address=inc_data["address"],
            severity=inc_data["severity"],
            priority_score=triage["score"],
            priority_level=triage["priority_level"],
            status="triaged",
            source_type="simulation",
            is_demo=True,
            is_synthetic=True,
            data_confidence=inc_data.get("data_confidence", 0.7),
            affected_population=inc_data.get("affected_population"),
            agent_notes=json.dumps({"triage_explanation": triage.get("explanation", ""), "session_id": session.id}),
            score_components=json.dumps(triage.get("components", {})),
            triaged_at=datetime.utcnow(),
        )
        db.add(incident)
        created_incidents.append({
            "id": incident.id,
            "title": incident.title,
            "incident_type": incident.incident_type,
            "severity": incident.severity,
            "priority_level": incident.priority_level,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "address": incident.address,
            "is_synthetic": True,
        })

    # Log a simulation start event
    event = SimulationEvent(
        id=str(uuid.uuid4()),
        session_id=session.id,
        event_type="simulation_started",
        timestamp=datetime.utcnow(),
        data=json.dumps({"num_incidents": len(created_incidents), "scenario": scenario_type}),
        description=f"Simulation started: {len(created_incidents)} synthetic incidents generated for scenario '{scenario_type}'",
    )
    db.add(event)

    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()

    audit_service.log(
        db, actor="operator", action="simulation_run",
        entity_type="simulation", entity_id=session.id,
        new_value={"scenario": scenario_type, "incidents": len(created_incidents), "intensity": intensity},
        is_demo=True,
    )

    summary = engine.get_summary(incidents_data)
    return {
        "session_id": session.id,
        "name": session.name,
        "scenario_type": scenario_type,
        "intensity": intensity,
        "status": "completed",
        "incidents": created_incidents,
        "summary": summary,
        "warning": "⚠️ ALL INCIDENTS ARE SYNTHETIC DEMO DATA. This is not a validated disaster model.",
    }


@router.get("/{session_id}")
def get_simulation(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulation session not found")
    events = db.query(SimulationEvent).filter(SimulationEvent.session_id == session_id).all()
    return {
        "id": session.id,
        "name": session.name,
        "scenario_type": session.scenario_type,
        "intensity": session.intensity,
        "num_locations": session.num_locations,
        "status": session.status,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "events": [
            {
                "id": e.id, "event_type": e.event_type,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "description": e.description,
            }
            for e in events
        ],
    }
