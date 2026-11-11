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
