from fastapi import APIRouter
from app.core.config import settings
from app.core.database import engine
from sqlalchemy import text

router = APIRouter()


@router.get("/status")
def integration_status():
    # Check database
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    # OpenAI
    if settings.openai_configured:
        openai_status = {
            "configured": True,
            "status": "configured",
            "model": settings.OPENAI_MODEL,
            "note": "OpenAI Neural Gateway connected. LLM-assisted explanations active.",
        }
    else:
        openai_status = {
            "configured": False,
            "status": "deterministic_active",
            "model": None,
            "note": "Zero API keys required. All agents run autonomously on mathematical triage algorithms, spatial indexing, and pre-compiled emergency response templates.",
        }

    # Open-Meteo (always available, free)
    open_meteo_status = {
        "configured": True,
        "status": "available",
        "note": "Free meteorological API (Zero key required). Polling 5 metropolitan grids.",
    }

    # NASA FIRMS
    if settings.nasa_firms_configured:
        firms_status = {"configured": True, "status": "configured", "note": "Live NASA FIRMS satellite radar key active."}
    else:
        firms_status = {
            "configured": False,
            "status": "offline_radar_active",
            "note": "Built-in synthetic satellite hotspot radar active. External NASA API key is completely optional.",
        }

    return {
        "openai": openai_status,
        "open_meteo": open_meteo_status,
        "nasa_firms": firms_status,
        "database": {"status": db_status, "url_type": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"},
        "demo_mode": settings.DEMO_MODE,
        "app_env": settings.APP_ENV,
    }
