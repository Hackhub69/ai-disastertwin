from typing import Optional, Any, Dict, List
from datetime import datetime
from pydantic import BaseModel, field_validator


class IncidentCreate(BaseModel):
    title: str
    description: str
    incident_type: str
    latitude: float
    longitude: float
    address: str = ""
    severity: int = 3
    source_type: str = "manual"
    is_demo: bool = True
    affected_population: Optional[int] = None
    reporter_name: str = ""
    reporter_contact: str = ""
    data_confidence: float = 1.0

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("severity must be between 1 and 5")
        return v


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    severity: Optional[int] = None
    status: Optional[str] = None
    priority_level: Optional[str] = None
    source_type: Optional[str] = None
    affected_population: Optional[int] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    data_confidence: Optional[float] = None


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    incident_type: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    severity: Optional[int] = None
    priority_score: Optional[float] = None
    priority_level: Optional[str] = None
    status: Optional[str] = None
    source_type: Optional[str] = None
    is_demo: bool
    is_synthetic: bool
    data_confidence: Optional[float] = None
    affected_population: Optional[int] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    agent_notes: Optional[Any] = None
    score_components: Optional[Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    triaged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int
    page: int
