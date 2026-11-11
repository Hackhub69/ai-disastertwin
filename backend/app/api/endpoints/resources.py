import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.resources import Resource, ResourceRecommendation
from app.services.audit_service import audit_service

router = APIRouter()


def resource_to_dict(r: Resource) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "resource_type": r.resource_type,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "address": r.address or "",
        "status": r.status,
        "capacity": r.capacity,
        "current_load": r.current_load,
        "is_demo": r.is_demo,
        "operator_name": r.operator_name or "",
        "contact": r.contact or "",
        "last_updated": r.last_updated.isoformat() if r.last_updated else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
def list_resources(
    status: str = Query(None),
    resource_type: str = Query(None),
    is_demo: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Resource)
    if status:
        q = q.filter(Resource.status == status)
    if resource_type:
        q = q.filter(Resource.resource_type == resource_type)
    if is_demo is not None:
        q = q.filter(Resource.is_demo == is_demo)
    total = q.count()
    items = q.order_by(Resource.name).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [resource_to_dict(r) for r in items], "total": total, "page": page}


@router.post("", status_code=201)
def create_resource(data: dict, db: Session = Depends(get_db)):
    if data.get("latitude") is None or data.get("longitude") is None:
        raise HTTPException(status_code=422, detail="latitude and longitude are required")
    if not data.get("name"):
        raise HTTPException(status_code=422, detail="name is required")
    if not data.get("resource_type"):
        raise HTTPException(status_code=422, detail="resource_type is required")

    resource = Resource(
        id=str(uuid.uuid4()),
        name=data["name"],
        resource_type=data["resource_type"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        address=data.get("address", ""),
        status=data.get("status", "available"),
        capacity=data.get("capacity", 1),
        current_load=data.get("current_load", 0),
        is_demo=data.get("is_demo", True),
        operator_name=data.get("operator_name", ""),
        contact=data.get("contact", ""),
        last_updated=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    audit_service.log(
        db, actor=data.get("actor", "operator"), action="resource_created",
        entity_type="resource", entity_id=resource.id,
        new_value={"name": resource.name, "type": resource.resource_type},
        is_demo=resource.is_demo,
    )
    return resource_to_dict(resource)


@router.get("/{resource_id}")
def get_resource(resource_id: str, db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource_to_dict(r)


@router.patch("/{resource_id}")
def update_resource(resource_id: str, data: dict, db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found")
    for field in ["status", "capacity", "current_load", "address", "operator_name", "contact"]:
        if field in data:
            setattr(r, field, data[field])
    r.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(r)
    audit_service.log(
        db, actor=data.get("actor", "operator"), action="resource_updated",
        entity_type="resource", entity_id=resource_id,
        new_value={k: data[k] for k in ["status", "capacity", "current_load"] if k in data},
        is_demo=r.is_demo,
    )
    return resource_to_dict(r)
