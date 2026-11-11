import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, DateTime, ForeignKey
from app.core.database import Base


class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200))
    scenario_type = Column(String(50))
    intensity = Column(Float)
    num_locations = Column(Integer)
    num_resources = Column(Integer)
    status = Column(String(20), default="pending")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    config = Column(Text)  # JSON


class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("simulation_sessions.id"), nullable=False)
    event_type = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
    data = Column(Text)   # JSON
    description = Column(Text)
