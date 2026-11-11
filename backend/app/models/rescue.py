import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from app.core.database import Base


class RescueTeam(Base):
    """A rescue team with members, skills, and current status."""
    __tablename__ = "rescue_teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)          # e.g. "Rescue Team Alpha"
    team_code = Column(String(20), unique=True)          # e.g. "RTA-01"
    team_leader = Column(String(100))
    responder_count = Column(Integer, default=0)
    skills = Column(Text)                               # JSON list: ["water_rescue","first_aid"]
    equipment = Column(Text)                            # JSON list
    base_location = Column(String(300))
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String(30), default="available")    # available/deployed/standby/offline
    specialty = Column(String(50))                      # flood/fire/medical/search_rescue/general
    contact_number = Column(String(30))
    is_demo = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RescueAssignment(Base):
    """Links a rescue team to an incident with approval workflow."""
    __tablename__ = "rescue_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("rescue_teams.id"), nullable=False)
    response_plan_id = Column(String(36), ForeignKey("response_plans.id"), nullable=True)

    # Workflow status
    status = Column(String(30), default="recommended")
    # available → recommended → awaiting_approval → assigned →
    # responding → on_scene → assisting → completed | cancelled | escalated

    recommended_by = Column(String(100), default="system")
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)

    # Operational data
    priority_at_assignment = Column(String(20))
    notes = Column(Text)
    completion_report = Column(Text)           # JSON summary
    resources_used = Column(Text)              # JSON list
    people_assisted = Column(Integer, default=0)
    outstanding_risks = Column(Text)

    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)


class ResponsePlan(Base):
    """AI-generated structured rescue response plan for an incident."""
    __tablename__ = "response_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)

    # Plan content (stored as JSON strings)
    situation_summary = Column(Text)
    known_hazards = Column(Text)               # JSON list
    recommended_team_type = Column(String(50))
    required_skills = Column(Text)             # JSON list
    recommended_equipment = Column(Text)       # JSON list
    action_checklist = Column(Text)            # JSON list of {id, step, description}
    coordination_instructions = Column(Text)
    external_services_needed = Column(Text)    # JSON list: ["fire","medical","police"]
    uncertainties = Column(Text)               # JSON list
    escalation_conditions = Column(Text)       # JSON list
    additional_resources_needed = Column(Text) # JSON list

    # Meta
    generated_by = Column(String(50), default="template")   # template / llm / hybrid
    template_used = Column(String(50))
    approval_status = Column(String(20), default="draft")   # draft / approved / rejected
    approved_by = Column(String(100))
    approved_at = Column(DateTime)

    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChecklistItem(Base):
    """Individual checklist task within a response plan or assignment."""
    __tablename__ = "checklist_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(String(36), ForeignKey("rescue_assignments.id"), nullable=True)
    response_plan_id = Column(String(36), ForeignKey("response_plans.id"), nullable=True)

    step_number = Column(Integer)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    category = Column(String(50))    # safety/communication/action/report/escalation
    is_mandatory = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)

    # Completion
    completed = Column(Boolean, default=False)
    completed_by = Column(String(100))
    completed_at = Column(DateTime)
    notes = Column(Text)

    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamMessage(Base):
    """Operator-drafted messages: briefings, updates, resource requests, completion."""
    __tablename__ = "team_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(String(36), ForeignKey("rescue_assignments.id"), nullable=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)

    message_type = Column(String(50))   # briefing/situation_update/resource_request/completion
    content_en = Column(Text)
    content_hi = Column(Text)
    content_mr = Column(Text)

    status = Column(String(20), default="draft")   # draft/approved/sent/simulated
    created_by = Column(String(100), default="operator")
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    sent_at = Column(DateTime)
    delivery_note = Column(Text)

    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TeamStatusUpdate(Base):
    """Status change events for a rescue assignment (timeline)."""
    __tablename__ = "team_status_updates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(String(36), ForeignKey("rescue_assignments.id"), nullable=False)
    old_status = Column(String(30))
    new_status = Column(String(30))
    updated_by = Column(String(100))
    notes = Column(Text)
    is_demo = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
