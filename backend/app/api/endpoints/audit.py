from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit import AuditEvent

router = APIRouter()


@router.get("")
def list_audit(
    entity_type: str = Query(None),
    actor: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(AuditEvent)
    if entity_type:
        q = q.filter(AuditEvent.entity_type == entity_type)
    if actor:
        q = q.filter(AuditEvent.actor == actor)
    total = q.count()
    items = (
        q.order_by(AuditEvent.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [
            {
                "id": a.id,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                "actor": a.actor,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "reason": a.reason or "",
                "is_demo": a.is_demo,
            }
            for a in items
        ],
        "total": total,
        "page": page,
    }
