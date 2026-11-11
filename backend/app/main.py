from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.router import api_router

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI DisasterTwin Rescue API",
    description=(
        "Multi-Agent Disaster Response Coordinator — SIH 2026 Demo.\n\n"
        "⚠️ **DEMO MODE**: All data is synthetic unless labeled otherwise.\n"
        "This is a decision-support prototype, not an emergency authority."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
        "health": "/api/health",
    }
