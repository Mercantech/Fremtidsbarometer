from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_db
from database.models import SystemSetting, BroadcastPin
from api.schemas import GlobeConfigSchema, BroadcastPinSchema

router = APIRouter(prefix="/api/globe", tags=["Globe"])

DEFAULT_GLOBE_CONFIG = {
    "batch_rotation_seconds": 15,
    "max_visible_pins": 14,
    "hype_ratio": 50,
    "prioritize_salary": True,
    "prioritize_trending_tech": True,
    "pause_on_hover": True,
}


@router.get("/config", response_model=GlobeConfigSchema)
def get_public_globe_config(db: Session = Depends(get_db)):
    """Returns the current 3D Globe Radar display configuration."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    if setting and isinstance(setting.value, dict):
        return GlobeConfigSchema(**{**DEFAULT_GLOBE_CONFIG, **setting.value})
    return GlobeConfigSchema(**DEFAULT_GLOBE_CONFIG)


@router.get("/broadcasts", response_model=List[BroadcastPinSchema])
def get_public_broadcast_pins(db: Session = Depends(get_db)):
    """
    Returns active, unexpired manual broadcast pins from Mercantec for live radar.
    """
    now = datetime.now(timezone.utc)
    return (
        db.query(BroadcastPin)
        .filter(BroadcastPin.is_active.is_(True), BroadcastPin.expires_at > now)
        .order_by(BroadcastPin.created_at.desc())
        .all()
    )

