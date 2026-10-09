from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database.session import get_db
from database.models import SystemSetting
from api.schemas import GlobeConfigSchema
from api.routes.globe import DEFAULT_GLOBE_CONFIG

router = APIRouter(tags=["Admin - Globe"])


@router.get("/globe/config", response_model=GlobeConfigSchema)
def get_admin_globe_config(db: Session = Depends(get_db)):
    """Retrieves 3D Globe Radar settings for the Admin Panel."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    if setting and isinstance(setting.value, dict):
        return GlobeConfigSchema(**{**DEFAULT_GLOBE_CONFIG, **setting.value})
    return GlobeConfigSchema(**DEFAULT_GLOBE_CONFIG)


@router.put("/globe/config", response_model=GlobeConfigSchema)
def update_admin_globe_config(config: GlobeConfigSchema, db: Session = Depends(get_db)):
    """Updates 3D Globe Radar settings from the Admin Panel."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    new_data = config.model_dump()

    if not setting:
        setting = SystemSetting(
            key="globe_config",
            value=new_data,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(setting)
    else:
        setting.value = new_data
        setting.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(setting)
    return GlobeConfigSchema(**setting.value)
