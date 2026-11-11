import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime
from app.core.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String(100))
    action = Column(String(100))
    entity_type = Column(String(50))
    entity_id = Column(String(36))
    old_value = Column(Text)   # JSON
    new_value = Column(Text)   # JSON
    reason = Column(Text)
    is_demo = Column(Boolean, default=True)
