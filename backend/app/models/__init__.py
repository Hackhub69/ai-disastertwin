# Import all models so they register with Base
from app.models.incidents import Incident
from app.models.resources import Resource, ResourceRecommendation
from app.models.alerts import AlertDraft
from app.models.audit import AuditEvent
from app.models.simulations import SimulationSession, SimulationEvent
from app.models.rescue import (
    RescueTeam,
    RescueAssignment,
    ResponsePlan,
    ChecklistItem,
    TeamMessage,
    TeamStatusUpdate,
)

__all__ = [
    "Incident",
    "Resource",
    "ResourceRecommendation",
    "AlertDraft",
    "AuditEvent",
    "SimulationSession",
    "SimulationEvent",
    "RescueTeam",
    "RescueAssignment",
    "ResponsePlan",
    "ChecklistItem",
    "TeamMessage",
    "TeamStatusUpdate",
]
