from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.session import get_db
from database.models import BroadcastPin
from api.services.audit_logger import log_admin_action
from api.schemas import (
    BroadcastPinCreateSchema,
    BroadcastPinUpdateSchema,
    BroadcastPinSchema,
)

router = APIRouter()


@router.get("/broadcasts", response_model=List[BroadcastPinSchema])
def list_broadcast_pins(
    active_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Returns all manual broadcast pins (Mercantec announcements, courses, hackathons).
    """
    query = db.query(BroadcastPin)
    if active_only:
        now = datetime.now(timezone.utc)
        query = query.filter(BroadcastPin.is_active.is_(True), BroadcastPin.expires_at > now)
    return query.order_by(desc(BroadcastPin.created_at)).all()


@router.post("/broadcasts", response_model=BroadcastPinSchema, status_code=status.HTTP_201_CREATED)
def create_broadcast_pin(
    payload: BroadcastPinCreateSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Creates a new manual broadcast pin on the 3D radar with mandatory justification.
    """
    now = datetime.now(timezone.utc)
    # Ensure expires_at is in the future
    if payload.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiration timestamp must be in the future"
        )

    pin = BroadcastPin(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        institution=payload.institution,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        url=payload.url,
        justification=payload.justification,
        expires_at=payload.expires_at,
        is_active=True,
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)

    log_admin_action(
        db,
        action="BROADCAST_CREATE",
        entity_type="broadcast_pin",
        entity_id=str(pin.id),
        details={
            "title": pin.title,
            "category": pin.category,
            "institution": pin.institution,
            "location": pin.location_name,
            "expires_at": pin.expires_at.isoformat() if pin.expires_at else None,
            "justification": pin.justification,
        },
        request=request,
    )
    db.commit()
    return pin


@router.get("/broadcasts/{pin_id}", response_model=BroadcastPinSchema)
def get_broadcast_pin(pin_id: int, db: Session = Depends(get_db)):
    """
    Returns single broadcast pin by ID.
    """
    pin = db.query(BroadcastPin).filter(BroadcastPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast pin not found")
    return pin


@router.put("/broadcasts/{pin_id}", response_model=BroadcastPinSchema)
def update_broadcast_pin(
    pin_id: int,
    payload: BroadcastPinUpdateSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Updates an existing manual broadcast pin.
    """
    pin = db.query(BroadcastPin).filter(BroadcastPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast pin not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(pin, k, v)

    log_admin_action(
        db,
        action="BROADCAST_UPDATE",
        entity_type="broadcast_pin",
        entity_id=str(pin_id),
        details={"updated_fields": list(update_dict.keys()), "title": pin.title},
        request=request,
    )
    db.commit()
    db.refresh(pin)
    return pin


@router.delete("/broadcasts/{pin_id}", status_code=status.HTTP_200_OK)
def delete_broadcast_pin(pin_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Permanently deletes a manual broadcast pin.
    """
    pin = db.query(BroadcastPin).filter(BroadcastPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast pin not found")

    title = pin.title
    db.delete(pin)
    log_admin_action(
        db,
        action="BROADCAST_DELETE",
        entity_type="broadcast_pin",
        entity_id=str(pin_id),
        details={"title": title},
        request=request,
    )
    db.commit()
    return {"status": "deleted", "id": pin_id, "title": title}


@router.post("/broadcasts/{pin_id}/toggle", response_model=BroadcastPinSchema)
def toggle_broadcast_pin(pin_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Toggles whether a broadcast pin is currently active.
    """
    pin = db.query(BroadcastPin).filter(BroadcastPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast pin not found")

    pin.is_active = not pin.is_active
    log_admin_action(
        db,
        action="BROADCAST_TOGGLE",
        entity_type="broadcast_pin",
        entity_id=str(pin_id),
        details={"is_active": pin.is_active, "title": pin.title},
        request=request,
    )
    db.commit()
    db.refresh(pin)
    return pin
