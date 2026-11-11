from typing import Optional, Literal, List
from datetime import datetime
from pydantic import BaseModel, field_validator


class SimulationCreate(BaseModel):
    name: str = ""
    scenario_type: Literal["urban_flooding", "heavy_rainfall", "heatwave", "wildfire"]
    intensity: float = 0.5
    num_locations: int = 5
    num_resources: int = 3

    @field_validator("intensity")
    @classmethod
    def validate_intensity(cls, v: float) -> float:
        if not (0.1 <= v <= 1.0):
            raise ValueError("intensity must be between 0.1 and 1.0")
        return v

    @field_validator("num_locations")
    @classmethod
    def validate_num_locations(cls, v: int) -> int:
        if not (1 <= v <= 20):
            raise ValueError("num_locations must be between 1 and 20")
        return v

    @field_validator("num_resources")
    @classmethod
    def validate_num_resources(cls, v: int) -> int:
        if not (1 <= v <= 10):
            raise ValueError("num_resources must be between 1 and 10")
        return v


class SimulationResponse(BaseModel):
    id: str
    name: Optional[str] = None
    scenario_type: Optional[str] = None
    intensity: Optional[float] = None
    num_locations: Optional[int] = None
    num_resources: Optional[int] = None
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    config: Optional[str] = None

    model_config = {"from_attributes": True}


class SimulationEventResponse(BaseModel):
    id: str
    session_id: str
    event_type: Optional[str] = None
    timestamp: Optional[datetime] = None
    data: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}
