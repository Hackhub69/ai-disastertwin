import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime
from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    incident_type = Column(String(50))  # flood/fire/heatwave/earthquake/other
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(300))
    severity = Column(Integer)  # 1-5
    priority_score = Column(Float, default=0.0)
    priority_level = Column(String(20))  # critical/high/medium/low
    status = Column(String(30), default="reported")
    source_type = Column(String(30), default="manual")
    is_demo = Column(Boolean, default=True)
    is_synthetic = Column(Boolean, default=False)
    data_confidence = Column(Float, default=1.0)
    affected_population = Column(Integer, nullable=True)
    reporter_name = Column(String(100))
    reporter_contact = Column(String(100))
    agent_notes = Column(Text)         # JSON string
    score_components = Column(Text)    # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    triaged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
