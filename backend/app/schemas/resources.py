from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ResourceCreate(BaseModel):
    name: str
    resource_type: str
    latitude: float
    longitude: float
    address: str = ""
    status: str = "available"
    capacity: int
    current_load: int = 0
    is_demo: bool = True
    operator_name: str = ""
    contact: str = ""


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    resource_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    status: Optional[str] = None
    capacity: Optional[int] = None
    current_load: Optional[int] = None
    operator_name: Optional[str] = None
    contact: Optional[str] = None


class ResourceResponse(BaseModel):
    id: str
    name: str
    resource_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    status: Optional[str] = None
    capacity: Optional[int] = None
    current_load: Optional[int] = None
    is_demo: bool
    operator_name: Optional[str] = None
    contact: Optional[str] = None
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResourceRecommendationResponse(BaseModel):
    id: str
    incident_id: str
    resource_id: str
    recommendation_score: Optional[float] = None
    distance_km: Optional[float] = None
    reasoning: Optional[str] = None
    status: Optional[str] = None
    recommended_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    resource: Optional[ResourceResponse] = None

    model_config = {"from_attributes": True}


class RecommendationRequest(BaseModel):
    incident_id: str
