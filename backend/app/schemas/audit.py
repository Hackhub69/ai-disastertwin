from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    timestamp: Optional[datetime] = None
    actor: Optional[str] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    is_demo: bool = True

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    items: List[AuditEventResponse]
    total: int
