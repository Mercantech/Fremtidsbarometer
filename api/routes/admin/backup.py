from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
import json

from database.session import get_db
from database.models import Era, SystemSetting, BroadcastPin
from api.services.audit_logger import log_admin_action

router = APIRouter()


@router.get("/backup/export")
def export_backup(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Exports a complete JSON backup containing all Eras, 3D Globe Radar settings,
    and active Broadcast Pins. Zero data loss.
    """
    eras = db.query(Era).order_by(Era.year).all()
    eras_data = [
        {
            "year": e.year,
            "title": e.title,
            "subtitle": e.subtitle,
            "stats": e.stats or {},
        }
        for e in eras
    ]

    globe_setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    globe_config = globe_setting.value if globe_setting and isinstance(globe_setting.value, dict) else {}

    broadcasts = db.query(BroadcastPin).all()
    broadcasts_data = [
        {
            "title": b.title,
            "description": b.description,
            "category": b.category,
            "institution": b.institution,
            "location_name": b.location_name,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "url": b.url,
            "justification": b.justification,
            "expires_at": b.expires_at.isoformat() if b.expires_at else None,
            "is_active": b.is_active,
        }
        for b in broadcasts
    ]

    return {
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "eras_count": len(eras_data),
        "eras": eras_data,
        "globe_config": globe_config,
        "broadcasts_count": len(broadcasts_data),
        "broadcasts": broadcasts_data,
    }


@router.post("/backup/import")
def import_backup(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Imports and restores configuration and eras from a verified JSON backup snapshot.
    """
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup structure: payload must be a JSON object"
        )

    eras_imported = 0
    broadcasts_imported = 0
    globe_restored = False

    # 1. Restore Eras
    eras_list = payload.get("eras", [])
    if isinstance(eras_list, list):
        for item in eras_list:
            if not isinstance(item, dict) or "year" not in item or "title" not in item:
                continue
            year = item["year"]
            existing = db.query(Era).filter(Era.year == year).first()
            if existing:
                existing.title = item.get("title", existing.title)
                existing.subtitle = item.get("subtitle", existing.subtitle)
                existing.stats = item.get("stats", existing.stats or {})
            else:
                new_era = Era(
                    year=year,
                    title=item.get("title", f"Era {year}"),
                    subtitle=item.get("subtitle", ""),
                    stats=item.get("stats", {}),
                )
                db.add(new_era)
            eras_imported += 1

    # 2. Restore Globe Config
    globe_cfg = payload.get("globe_config")
    if isinstance(globe_cfg, dict) and globe_cfg:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
        if not setting:
            setting = SystemSetting(key="globe_config", value=globe_cfg)
            db.add(setting)
        else:
            setting.value = globe_cfg
        globe_restored = True

    # 3. Restore Broadcasts
    b_list = payload.get("broadcasts", [])
    if isinstance(b_list, list):
        now = datetime.now(timezone.utc)
        for b_item in b_list:
            if not isinstance(b_item, dict) or "title" not in b_item or "latitude" not in b_item:
                continue
            exp_str = b_item.get("expires_at")
            exp_dt = None
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(exp_str)
                except Exception:
                    pass
            if not exp_dt or exp_dt <= now:
                # Set default future expiry
                from datetime import timedelta
                exp_dt = now + timedelta(days=30)

            new_b = BroadcastPin(
                title=b_item.get("title", "Broadcast"),
                description=b_item.get("description", "Announcement body"),
                category=b_item.get("category", "education"),
                institution=b_item.get("institution", "Mercantec"),
                location_name=b_item.get("location_name", "Viborg, Denmark"),
                latitude=b_item.get("latitude", 56.4532),
                longitude=b_item.get("longitude", 9.4020),
                url=b_item.get("url"),
                justification=b_item.get("justification", "Imported from backup snapshot"),
                expires_at=exp_dt,
                is_active=b_item.get("is_active", True),
            )
            db.add(new_b)
            broadcasts_imported += 1

    log_admin_action(
        db,
        action="BACKUP_IMPORT",
        entity_type="backup",
        details={
            "eras_imported": eras_imported,
            "globe_config_restored": globe_restored,
            "broadcasts_imported": broadcasts_imported,
        },
        request=request,
    )
    db.commit()

    return {
        "status": "restored",
        "eras_imported": eras_imported,
        "globe_config_restored": globe_restored,
        "broadcasts_imported": broadcasts_imported,
        "restored_at": datetime.now(timezone.utc).isoformat(),
    }
