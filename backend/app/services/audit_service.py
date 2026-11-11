from sqlalchemy.orm import Session
from app.models.audit import AuditEvent
import uuid
import json
from datetime import datetime


class AuditService:
    def log(
        self,
        db: Session,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        old_value=None,
        new_value=None,
        reason: str = "",
        is_demo: bool = True,
    ) -> AuditEvent:
        event = AuditEvent(
            id=str(uuid.uuid4()),
            actor=actor or "system",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=json.dumps(old_value) if old_value is not None else None,
            new_value=json.dumps(new_value) if new_value is not None else None,
            reason=reason,
            is_demo=is_demo,
        )
        db.add(event)
        db.commit()
        return event


audit_service = AuditService()
