import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.core.database import Base


class AlertDraft(Base):
    __tablename__ = "alert_drafts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    content_en = Column(Text)
    content_hi = Column(Text)
    content_mr = Column(Text)
    status = Column(String(20), default="draft")  # draft/approved/rejected/published
    created_by = Column(String(100))
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    publication_note = Column(Text)
