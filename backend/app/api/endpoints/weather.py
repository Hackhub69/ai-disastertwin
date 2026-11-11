from fastapi import APIRouter, HTTPException, Query
from app.services.weather_service import get_weather

router = APIRouter()


@router.get("")
async def weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    location_name: str = Query("", description="Human-readable location name"),
):
    result = await get_weather(lat, lon, location_name)
    if result.get("error") and not result.get("current"):
        # Still return 200 with error info — don't crash the UI
        return result
    return result
