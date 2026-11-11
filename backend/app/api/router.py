from fastapi import APIRouter
from app.api.endpoints import (
    health,
    dashboard,
    incidents,
    resources,
    recommendations,
    approvals,
    simulations,
    alerts,
    audit,
    integrations,
    weather,
    rescue,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["Simulations"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(rescue.router, prefix="/rescue", tags=["Rescue Response"])
