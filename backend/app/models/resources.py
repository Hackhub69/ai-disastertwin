import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from app.core.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    resource_type = Column(String(50))  # ambulance/rescue_team/shelter/fire_engine/medical_supply/water_tanker/helicopter/other
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String(300))
    status = Column(String(30), default="available")  # available/deployed/maintenance/offline
    capacity = Column(Integer)
    current_load = Column(Integer, default=0)
    is_demo = Column(Boolean, default=True)
    operator_name = Column(String(100))
    contact = Column(String(100))
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class ResourceRecommendation(Base):
    __tablename__ = "resource_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    resource_id = Column(String(36), ForeignKey("resources.id"), nullable=False)
    recommendation_score = Column(Float)
    distance_km = Column(Float)
    reasoning = Column(Text)
    status = Column(String(20), default="pending")  # pending/approved/rejected/withdrawn
    recommended_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String(100))
    rejection_reason = Column(Text)
