"""Vercel serverless entry point for the FastAPI application."""

from pathlib import Path
import os
import sys


BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Vercel functions have a read-only deployment filesystem. The demo database
# is therefore kept in the writable temporary directory for each instance.
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/disastertwin.db")

from app.main import app  # noqa: E402


def _load_demo_data() -> None:
    """Populate a new serverless demo database with the presentation dataset."""
    if os.environ.get("VERCEL") != "1":
        return

    from app.core.database import SessionLocal
    from app.models.incidents import Incident
    from app.models.rescue import RescueAssignment

    db = SessionLocal()
    try:
        has_incidents = db.query(Incident.id).first() is not None
        has_rescue_demo = (
            db.query(RescueAssignment.id)
            .filter(RescueAssignment.id == "asgn-mumbai-echo-05")
            .first()
            is not None
        )
    finally:
        db.close()

    if not has_incidents or not has_rescue_demo:
        from seed import seed_all

        seed_all()


_load_demo_data()
