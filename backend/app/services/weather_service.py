import httpx
from datetime import datetime
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Simple in-memory cache: key -> (timestamp, data)
_cache: dict = {}
CACHE_TTL_SECONDS = 600  # 10 minutes

WEATHERCODE_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Icy fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Slight showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
}


async def get_weather(lat: float, lon: float, location_name: str = "") -> dict:
    cache_key = f"{lat:.3f},{lon:.3f}"
    now = datetime.utcnow()

    if cache_key in _cache:
        cached_time, cached_data = _cache[cache_key]
        if (now - cached_time).total_seconds() < CACHE_TTL_SECONDS:
            cached_data = dict(cached_data)
            cached_data["from_cache"] = True
            return cached_data

    try:
        url = settings.OPENMETEO_BASE_URL
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation,windspeed_10m,weathercode,relative_humidity_2m",
            "forecast_days": 1,
            "timezone": "auto",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        current = data.get("current", {})
        weathercode = current.get("weathercode", 0)

        result = {
            "location": location_name or f"{lat:.3f}°N, {lon:.3f}°E",
            "latitude": lat,
            "longitude": lon,
            "retrieved_at": now.isoformat(),
            "timezone": data.get("timezone", "UTC"),
            "current": {
                "temperature_c": current.get("temperature_2m"),
                "precipitation_mm": current.get("precipitation"),
                "windspeed_kmh": current.get("windspeed_10m"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "weathercode": weathercode,
                "weather_description": WEATHERCODE_DESCRIPTIONS.get(weathercode, f"Code {weathercode}"),
            },
            "source": "Open-Meteo (open-meteo.com)",
            "data_notice": (
                "Weather data is for informational purposes only. "
                "Do not infer flood warnings or evacuation safety solely from these readings."
            ),
            "from_cache": False,
            "error": None,
        }

        _cache[cache_key] = (now, result)
        return result

    except httpx.TimeoutException:
        return {
            "error": "Weather service timeout",
            "location": location_name,
            "latitude": lat,
            "longitude": lon,
        }
    except httpx.HTTPStatusError as e:
        return {
            "error": f"Weather API error: {e.response.status_code}",
            "location": location_name,
        }
    except Exception as e:
        logger.warning(f"Weather fetch failed: {type(e).__name__}: {e}")
        return {
            "error": "Weather data unavailable",
            "location": location_name,
            "latitude": lat,
            "longitude": lon,
        }
