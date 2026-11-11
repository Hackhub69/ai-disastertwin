from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel


class AlertDraftCreate(BaseModel):
    incident_id: str
    created_by: str = "operator"


class AlertApprovalRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    decided_by: str
    note: str = ""


class AlertDraftResponse(BaseModel):
    id: str
    incident_id: str
    content_en: Optional[str] = None
    content_hi: Optional[str] = None
    content_mr: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    publication_note: Optional[str] = None

    model_config = {"from_attributes": True}
