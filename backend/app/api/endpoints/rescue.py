"""
Rescue Response API endpoints.
All emergency dispatch requires explicit human approval.
"""
import json
import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.rescue import (
    RescueTeam, RescueAssignment, ResponsePlan,
    ChecklistItem, TeamMessage, TeamStatusUpdate,
)
from app.models.incidents import Incident
from app.agents.rescue_response_agent import RescueResponseAgent
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter()
rescue_agent = RescueResponseAgent(settings)
audit_service = AuditService()

# Valid status transitions
VALID_TRANSITIONS = {
    "recommended":        ["awaiting_approval", "cancelled"],
    "awaiting_approval":  ["assigned", "cancelled"],
    "assigned":           ["responding", "cancelled"],
    "responding":         ["on_scene", "cancelled", "escalated"],
    "on_scene":           ["assisting", "completed", "escalated"],
    "assisting":          ["completed", "escalated"],
    "completed":          [],
    "cancelled":          [],
    "escalated":          ["responding", "cancelled"],
}

# Statuses that require prior human approval
APPROVAL_REQUIRED_STATUSES = {"assigned", "responding", "on_scene", "assisting"}


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    team_code: Optional[str] = None
    team_leader: Optional[str] = None
    responder_count: int = 0
    skills: Optional[List[str]] = []
    equipment: Optional[List[str]] = []
    base_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    specialty: Optional[str] = None
    contact_number: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool = True


class TeamUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    team_leader: Optional[str] = None
    responder_count: Optional[int] = None


class PlanCreate(BaseModel):
    incident_id: str
    operator: Optional[str] = "operator"


class PlanApprove(BaseModel):
    action: str  # "approve" or "reject"
    approved_by: str
    reason: Optional[str] = None


class AssignmentCreate(BaseModel):
    incident_id: str
    team_id: str
    response_plan_id: Optional[str] = None
    recommended_by: Optional[str] = "operator"
    notes: Optional[str] = None


class AssignmentStatusUpdate(BaseModel):
    new_status: str
    updated_by: str = "operator"
    notes: Optional[str] = None


class AssignmentApprove(BaseModel):
    action: str  # "approve" or "reject"
    approved_by: str
    rejection_reason: Optional[str] = None


class CompletionReport(BaseModel):
    people_assisted: int = 0
    outstanding_risks: Optional[str] = None
    resources_used: Optional[List[str]] = []
    notes: Optional[str] = None
    completed_by: str = "operator"


class ChecklistUpdate(BaseModel):
    completed: bool
    completed_by: str = "operator"
    notes: Optional[str] = None


class MessageCreate(BaseModel):
    message_type: str
    assignment_id: Optional[str] = None
    incident_id: Optional[str] = None
    created_by: str = "operator"
    extra: Optional[dict] = {}


class MessageApprove(BaseModel):
    action: str  # "approve" or "reject"
    approved_by: str


# ─── Serializers ──────────────────────────────────────────────────────────────

def _team_dict(t: RescueTeam) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "team_code": t.team_code,
        "team_leader": t.team_leader,
        "responder_count": t.responder_count,
        "skills": json.loads(t.skills or "[]"),
        "equipment": json.loads(t.equipment or "[]"),
        "base_location": t.base_location,
        "latitude": t.latitude,
        "longitude": t.longitude,
        "status": t.status,
        "specialty": t.specialty,
        "contact_number": t.contact_number,
        "notes": t.notes,
        "is_demo": t.is_demo,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _plan_dict(p: ResponsePlan) -> dict:
    return {
        "id": p.id,
        "incident_id": p.incident_id,
        "situation_summary": p.situation_summary,
        "known_hazards": json.loads(p.known_hazards or "[]"),
        "recommended_team_type": p.recommended_team_type,
        "required_skills": json.loads(p.required_skills or "[]"),
        "recommended_equipment": json.loads(p.recommended_equipment or "[]"),
        "action_checklist": json.loads(p.action_checklist or "[]"),
        "coordination_instructions": p.coordination_instructions,
        "external_services_needed": json.loads(p.external_services_needed or "[]"),
        "uncertainties": json.loads(p.uncertainties or "[]"),
        "escalation_conditions": json.loads(p.escalation_conditions or "[]"),
        "additional_resources_needed": json.loads(p.additional_resources_needed or "[]"),
        "generated_by": p.generated_by,
        "template_used": p.template_used,
        "approval_status": p.approval_status,
        "approved_by": p.approved_by,
        "approved_at": p.approved_at.isoformat() if p.approved_at else None,
        "is_demo": p.is_demo,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _checklist_dict(c: ChecklistItem) -> dict:
    return {
        "id": c.id,
        "assignment_id": c.assignment_id,
        "response_plan_id": c.response_plan_id,
        "step_number": c.step_number,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "is_mandatory": c.is_mandatory,
        "requires_approval": c.requires_approval,
        "completed": c.completed,
        "completed_by": c.completed_by,
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        "notes": c.notes,
        "is_demo": c.is_demo,
    }


def _timeline_dict(t: TeamStatusUpdate) -> dict:
    return {
        "id": t.id,
        "old_status": t.old_status,
        "new_status": t.new_status,
        "updated_by": t.updated_by,
        "notes": t.notes,
        "timestamp": t.timestamp.isoformat() if t.timestamp else None,
    }


def _assignment_dict(a: RescueAssignment, db: Session) -> dict:
    team = db.query(RescueTeam).filter(RescueTeam.id == a.team_id).first()
    incident = db.query(Incident).filter(Incident.id == a.incident_id).first()
    checklist = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.assignment_id == a.id)
        .order_by(ChecklistItem.step_number)
        .all()
    )
    timeline = (
        db.query(TeamStatusUpdate)
        .filter(TeamStatusUpdate.assignment_id == a.id)
        .order_by(TeamStatusUpdate.timestamp)
        .all()
    )
    return {
        "id": a.id,
        "incident_id": a.incident_id,
        "incident_title": incident.title if incident else None,
        "incident_type": incident.incident_type if incident else None,
        "team_id": a.team_id,
        "team_name": team.name if team else None,
        "team_code": team.team_code if team else None,
        "response_plan_id": a.response_plan_id,
        "status": a.status,
        "recommended_by": a.recommended_by,
        "approved_by": a.approved_by,
        "approved_at": a.approved_at.isoformat() if a.approved_at else None,
        "rejection_reason": a.rejection_reason,
        "priority_at_assignment": a.priority_at_assignment,
        "notes": a.notes,
        "completion_report": json.loads(a.completion_report or "{}"),
        "resources_used": json.loads(a.resources_used or "[]"),
        "people_assisted": a.people_assisted,
        "outstanding_risks": a.outstanding_risks,
        "is_demo": a.is_demo,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "checklist": [_checklist_dict(c) for c in checklist],
        "timeline": [_timeline_dict(t) for t in timeline],
    }


def _message_dict(m: TeamMessage) -> dict:
    return {
        "id": m.id,
        "assignment_id": m.assignment_id,
        "incident_id": m.incident_id,
        "message_type": m.message_type,
        "content_en": m.content_en,
        "content_hi": m.content_hi,
        "content_mr": m.content_mr,
        "status": m.status,
        "created_by": m.created_by,
        "approved_by": m.approved_by,
        "approved_at": m.approved_at.isoformat() if m.approved_at else None,
        "sent_at": m.sent_at.isoformat() if m.sent_at else None,
        "delivery_note": m.delivery_note,
        "is_demo": m.is_demo,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def rescue_dashboard(db: Session = Depends(get_db)):
    active_plans = db.query(ResponsePlan).filter(ResponsePlan.approval_status != "rejected").count()
    teams_available = db.query(RescueTeam).filter(RescueTeam.status == "available").count()
    teams_deployed = db.query(RescueTeam).filter(RescueTeam.status == "deployed").count()
    pending_approvals = db.query(RescueAssignment).filter(
        RescueAssignment.status.in_(["recommended", "awaiting_approval"])
    ).count()
    active_assignments = db.query(RescueAssignment).filter(
        RescueAssignment.status.in_(["assigned", "responding", "on_scene", "assisting"])
    ).count()
    pending_messages = db.query(TeamMessage).filter(TeamMessage.status == "draft").count()
    return {
        "active_plans": active_plans,
        "teams_available": teams_available,
        "teams_deployed": teams_deployed,
        "pending_approvals": pending_approvals,
        "active_assignments": active_assignments,
        "pending_messages": pending_messages,
    }


# ─── Teams ────────────────────────────────────────────────────────────────────

@router.get("/teams")
def list_teams(
    status: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(RescueTeam)
    if status:
        q = q.filter(RescueTeam.status == status)
    if specialty:
        q = q.filter(RescueTeam.specialty == specialty)
    return [_team_dict(t) for t in q.order_by(RescueTeam.created_at.desc()).all()]


@router.post("/teams", status_code=201)
def create_team(body: TeamCreate, db: Session = Depends(get_db)):
    team = RescueTeam(
        id=str(uuid.uuid4()),
        name=body.name,
        team_code=body.team_code,
        team_leader=body.team_leader,
        responder_count=body.responder_count,
        skills=json.dumps(body.skills or []),
        equipment=json.dumps(body.equipment or []),
        base_location=body.base_location,
        latitude=body.latitude,
        longitude=body.longitude,
        specialty=body.specialty,
        contact_number=body.contact_number,
        notes=body.notes,
        is_demo=body.is_demo,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return _team_dict(team)


@router.get("/teams/{team_id}")
def get_team(team_id: str, db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter(RescueTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    return _team_dict(team)


@router.patch("/teams/{team_id}")
def update_team(team_id: str, body: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter(RescueTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    if body.status is not None:
        team.status = body.status
    if body.notes is not None:
        team.notes = body.notes
    if body.team_leader is not None:
        team.team_leader = body.team_leader
    if body.responder_count is not None:
        team.responder_count = body.responder_count
    team.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(team)
    return _team_dict(team)


# ─── Response Plans ───────────────────────────────────────────────────────────

@router.get("/plans")
def list_plans(
    incident_id: Optional[str] = None,
    approval_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(ResponsePlan)
    if incident_id:
        q = q.filter(ResponsePlan.incident_id == incident_id)
    if approval_status:
        q = q.filter(ResponsePlan.approval_status == approval_status)
    return [_plan_dict(p) for p in q.order_by(ResponsePlan.created_at.desc()).all()]


@router.post("/plans", status_code=201)
def generate_plan(body: PlanCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == body.incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    incident_dict = {
        "id": incident.id,
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "priority_level": incident.priority_level,
        "address": incident.address,
        "description": incident.description,
        "affected_population": incident.affected_population,
    }
    plan_data = rescue_agent.generate_response_plan(incident_dict)

    plan = ResponsePlan(
        id=str(uuid.uuid4()),
        incident_id=incident.id,
        is_demo=incident.is_demo,
        **plan_data,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    audit_service.log(
        db, actor=body.operator, action="response_plan_generated",
        entity_type="response_plan", entity_id=plan.id,
        new_value={"incident_id": incident.id, "incident_type": incident.incident_type},
        is_demo=incident.is_demo,
    )
    return _plan_dict(plan)


@router.get("/plans/{plan_id}")
def get_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(ResponsePlan).filter(ResponsePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Response plan not found")
    return _plan_dict(plan)


@router.patch("/plans/{plan_id}/approve")
def approve_plan(plan_id: str, body: PlanApprove, db: Session = Depends(get_db)):
    plan = db.query(ResponsePlan).filter(ResponsePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Response plan not found")
    if body.action == "approve":
        plan.approval_status = "approved"
        plan.approved_by = body.approved_by
        plan.approved_at = datetime.utcnow()
    elif body.action == "reject":
        plan.approval_status = "rejected"
        plan.approved_by = body.approved_by
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    audit_service.log(
        db, actor=body.approved_by, action=f"response_plan_{body.action}d",
        entity_type="response_plan", entity_id=plan.id,
        new_value={"approval_status": plan.approval_status, "reason": body.reason},
        is_demo=plan.is_demo,
    )
    return _plan_dict(plan)


# ─── Assignments ──────────────────────────────────────────────────────────────

@router.get("/assignments")
def list_assignments(
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(RescueAssignment)
    if status:
        q = q.filter(RescueAssignment.status == status)
    if incident_id:
        q = q.filter(RescueAssignment.incident_id == incident_id)
    if team_id:
        q = q.filter(RescueAssignment.team_id == team_id)
    return [_assignment_dict(a, db) for a in q.order_by(RescueAssignment.created_at.desc()).all()]


@router.post("/assignments", status_code=201)
def create_assignment(body: AssignmentCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == body.incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")
    team = db.query(RescueTeam).filter(RescueTeam.id == body.team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")

    assignment = RescueAssignment(
        id=str(uuid.uuid4()),
        incident_id=body.incident_id,
        team_id=body.team_id,
        response_plan_id=body.response_plan_id,
        status="recommended",
        recommended_by=body.recommended_by or "operator",
        priority_at_assignment=incident.priority_level,
        notes=body.notes,
        is_demo=incident.is_demo,
    )
    db.add(assignment)

    # Create checklist items
    for item in rescue_agent.get_checklist_items(incident.incident_type, is_demo=incident.is_demo):
        db.add(ChecklistItem(id=str(uuid.uuid4()), assignment_id=assignment.id, **item))

    # Timeline entry
    db.add(TeamStatusUpdate(
        id=str(uuid.uuid4()),
        assignment_id=assignment.id,
        old_status=None,
        new_status="recommended",
        updated_by=body.recommended_by or "operator",
        notes="Assignment created",
        is_demo=incident.is_demo,
    ))

    db.commit()
    db.refresh(assignment)

    audit_service.log(
        db, actor=body.recommended_by or "operator", action="assignment_created",
        entity_type="rescue_assignment", entity_id=assignment.id,
        new_value={"team": team.name, "incident_id": body.incident_id},
        is_demo=incident.is_demo,
    )
    return _assignment_dict(assignment, db)


@router.get("/assignments/{assignment_id}")
def get_assignment(assignment_id: str, db: Session = Depends(get_db)):
    a = db.query(RescueAssignment).filter(RescueAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    return _assignment_dict(a, db)


@router.patch("/assignments/{assignment_id}/status")
def update_assignment_status(
    assignment_id: str,
    body: AssignmentStatusUpdate,
    db: Session = Depends(get_db),
):
    a = db.query(RescueAssignment).filter(RescueAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    allowed = VALID_TRANSITIONS.get(a.status, [])
    if body.new_status not in allowed:
        raise HTTPException(
            400,
            f"Cannot transition from '{a.status}' to '{body.new_status}'. Allowed: {allowed}",
        )

    if body.new_status in APPROVAL_REQUIRED_STATUSES and not a.approved_by:
        raise HTTPException(
            403,
            f"Status '{body.new_status}' requires prior human approval. "
            f"Use POST /assignments/{assignment_id}/approve first.",
        )

    old_status = a.status
    a.status = body.new_status
    a.updated_at = datetime.utcnow()
    if body.new_status == "completed":
        a.completed_at = datetime.utcnow()

    db.add(TeamStatusUpdate(
        id=str(uuid.uuid4()),
        assignment_id=a.id,
        old_status=old_status,
        new_status=body.new_status,
        updated_by=body.updated_by,
        notes=body.notes,
        is_demo=a.is_demo,
    ))
    db.commit()
    db.refresh(a)

    audit_service.log(
        db, actor=body.updated_by, action=f"assignment_status_{body.new_status}",
        entity_type="rescue_assignment", entity_id=a.id,
        new_value={"old_status": old_status, "new_status": body.new_status},
        is_demo=a.is_demo,
    )
    return _assignment_dict(a, db)


@router.post("/assignments/{assignment_id}/approve")
def approve_assignment(
    assignment_id: str,
    body: AssignmentApprove,
    db: Session = Depends(get_db),
):
    a = db.query(RescueAssignment).filter(RescueAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    if a.status not in ("recommended", "awaiting_approval"):
        raise HTTPException(400, f"Assignment in status '{a.status}' cannot be approved/rejected here.")

    old_status = a.status
    if body.action == "approve":
        a.approved_by = body.approved_by
        a.approved_at = datetime.utcnow()
        a.status = "assigned"
        a.updated_at = datetime.utcnow()
        # Mark team as deployed
        team = db.query(RescueTeam).filter(RescueTeam.id == a.team_id).first()
        if team:
            team.status = "deployed"
        db.add(TeamStatusUpdate(
            id=str(uuid.uuid4()),
            assignment_id=a.id,
            old_status=old_status,
            new_status="assigned",
            updated_by=body.approved_by,
            notes="Assignment approved and assigned by operator",
            is_demo=a.is_demo,
        ))
    elif body.action == "reject":
        a.status = "cancelled"
        a.rejection_reason = body.rejection_reason
        a.updated_at = datetime.utcnow()
        db.add(TeamStatusUpdate(
            id=str(uuid.uuid4()),
            assignment_id=a.id,
            old_status=old_status,
            new_status="cancelled",
            updated_by=body.approved_by,
            notes=f"Rejected: {body.rejection_reason or 'no reason given'}",
            is_demo=a.is_demo,
        ))
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    db.commit()
    db.refresh(a)
    audit_service.log(
        db, actor=body.approved_by, action=f"assignment_{body.action}d",
        entity_type="rescue_assignment", entity_id=a.id,
        new_value={"status": a.status, "rejection_reason": a.rejection_reason},
        is_demo=a.is_demo,
    )
    return _assignment_dict(a, db)


@router.post("/assignments/{assignment_id}/complete")
def complete_assignment(
    assignment_id: str,
    body: CompletionReport,
    db: Session = Depends(get_db),
):
    a = db.query(RescueAssignment).filter(RescueAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    if a.status not in ("on_scene", "assisting", "responding"):
        raise HTTPException(400, f"Cannot complete assignment in status '{a.status}'")

    old_status = a.status
    a.status = "completed"
    a.completed_at = datetime.utcnow()
    a.people_assisted = body.people_assisted
    a.outstanding_risks = body.outstanding_risks
    a.resources_used = json.dumps(body.resources_used or [])
    a.notes = body.notes
    a.completion_report = json.dumps({
        "people_assisted": body.people_assisted,
        "outstanding_risks": body.outstanding_risks,
        "resources_used": body.resources_used,
        "notes": body.notes,
        "completed_by": body.completed_by,
        "completed_at": datetime.utcnow().isoformat(),
    })
    a.updated_at = datetime.utcnow()

    team = db.query(RescueTeam).filter(RescueTeam.id == a.team_id).first()
    if team:
        team.status = "available"

    db.add(TeamStatusUpdate(
        id=str(uuid.uuid4()),
        assignment_id=a.id,
        old_status=old_status,
        new_status="completed",
        updated_by=body.completed_by,
        notes=f"Completion report submitted. People assisted: {body.people_assisted}",
        is_demo=a.is_demo,
    ))
    db.commit()
    db.refresh(a)

    audit_service.log(
        db, actor=body.completed_by, action="assignment_completed",
        entity_type="rescue_assignment", entity_id=a.id,
        new_value={"people_assisted": body.people_assisted, "outstanding_risks": body.outstanding_risks},
        is_demo=a.is_demo,
    )
    return _assignment_dict(a, db)


# ─── Checklist ────────────────────────────────────────────────────────────────

@router.get("/assignments/{assignment_id}/checklist")
def get_checklist(assignment_id: str, db: Session = Depends(get_db)):
    items = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.assignment_id == assignment_id)
        .order_by(ChecklistItem.step_number)
        .all()
    )
    return [_checklist_dict(c) for c in items]


@router.patch("/checklist/{item_id}")
def update_checklist_item(item_id: str, body: ChecklistUpdate, db: Session = Depends(get_db)):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Checklist item not found")
    item.completed = body.completed
    item.completed_by = body.completed_by
    item.completed_at = datetime.utcnow() if body.completed else None
    item.notes = body.notes
    db.commit()
    db.refresh(item)
    return _checklist_dict(item)


# ─── Messages ─────────────────────────────────────────────────────────────────

@router.post("/messages", status_code=201)
def generate_message(body: MessageCreate, db: Session = Depends(get_db)):
    incident = None
    assignment_dict = None
    team_dict = None

    if body.assignment_id:
        asgn = db.query(RescueAssignment).filter(RescueAssignment.id == body.assignment_id).first()
        if not asgn:
            raise HTTPException(404, "Assignment not found")
        incident = db.query(Incident).filter(Incident.id == asgn.incident_id).first()
        team = db.query(RescueTeam).filter(RescueTeam.id == asgn.team_id).first()
        assignment_dict = {
            "status": asgn.status,
            "people_assisted": asgn.people_assisted,
            "outstanding_risks": asgn.outstanding_risks or "None identified",
            "resources_used": asgn.resources_used or "[]",
            "notes": asgn.notes or "",
        }
        if team:
            team_dict = {"name": team.name, "team_leader": team.team_leader}
    elif body.incident_id:
        incident = db.query(Incident).filter(Incident.id == body.incident_id).first()

    if not incident:
        raise HTTPException(400, "Valid assignment_id or incident_id required")

    incident_d = {
        "id": incident.id,
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "priority_level": incident.priority_level,
        "address": incident.address,
        "description": incident.description,
    }

    content = rescue_agent.generate_message(
        message_type=body.message_type,
        incident=incident_d,
        assignment=assignment_dict,
        team=team_dict,
        extra=body.extra or {},
    )

    msg = TeamMessage(
        id=str(uuid.uuid4()),
        assignment_id=body.assignment_id,
        incident_id=incident.id,
        message_type=body.message_type,
        content_en=content["en"],
        content_hi=content["hi"],
        content_mr=content["mr"],
        status="draft",
        created_by=body.created_by,
        delivery_note="[DEMO] Simulated message - not transmitted to real teams.",
        is_demo=incident.is_demo,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_dict(msg)


@router.get("/assignments/{assignment_id}/messages")
def list_messages(assignment_id: str, db: Session = Depends(get_db)):
    msgs = (
        db.query(TeamMessage)
        .filter(TeamMessage.assignment_id == assignment_id)
        .order_by(TeamMessage.created_at.desc())
        .all()
    )
    return [_message_dict(m) for m in msgs]


@router.post("/messages/{message_id}/approve")
def approve_message(message_id: str, body: MessageApprove, db: Session = Depends(get_db)):
    msg = db.query(TeamMessage).filter(TeamMessage.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if body.action == "approve":
        msg.status = "approved"
        msg.approved_by = body.approved_by
        msg.approved_at = datetime.utcnow()
        msg.delivery_note = "[DEMO] Approved for simulated transmission. Not sent to real teams."
    elif body.action == "reject":
        msg.status = "draft"
        msg.delivery_note = f"Rejected by {body.approved_by}"
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    msg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    return _message_dict(msg)
