from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from database.session import get_db
from database.models import JobPosting, HypeAnalysis, SystemSetting
from api.schemas import PinBulkToggleRequest
from api.services.audit_logger import log_admin_action

router = APIRouter()


def _get_hidden_pins(db: Session) -> set:
    setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    if setting and isinstance(setting.value, dict):
        return set(setting.value.get("hidden_pins", []))
    return set()


def _save_hidden_pins(db: Session, hidden_set: set):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
    if not setting:
        setting = SystemSetting(key="globe_config", value={"hidden_pins": list(hidden_set)})
        db.add(setting)
    else:
        val = dict(setting.value or {})
        val["hidden_pins"] = list(hidden_set)
        setting.value = val
    db.commit()


@router.get("/pins")
def list_admin_pins(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    pin_type: Optional[str] = Query(None, alias="type"), # "job" | "hype"
    only_hidden: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Returns a unified, paginated list of pins (jobs and hype topics) for moderation.
    Includes protection against overwhelming lists with server-side pagination and search.
    """
    hidden_ids = _get_hidden_pins(db)
    items: List[Dict[str, Any]] = []

    # 1. Fetch Job Postings (up to 200 for combined ranking)
    if pin_type in (None, "", "job"):
        q_jobs = db.query(JobPosting).filter(JobPosting.status != "archived")
        if search:
            s = f"%{search}%"
            q_jobs = q_jobs.filter(or_(JobPosting.title.ilike(s), JobPosting.company.ilike(s), JobPosting.city.ilike(s)))
        jobs = q_jobs.order_by(desc(JobPosting.created_at)).limit(300).all()

        for j in jobs:
            p_id = f"job-{j.id}"
            is_hid = p_id in hidden_ids
            if only_hidden and not is_hid:
                continue
            items.append({
                "id": p_id,
                "raw_id": j.id,
                "type": "job",
                "title": j.title,
                "subtitle": f"{j.company or 'Unknown'} • {j.city or 'Remote'} ({j.country or 'GLOBAL'})",
                "city": j.city or "Remote",
                "country": j.country or "GLOBAL",
                "is_hidden": is_hid,
                "salary": f"${int(j.salary_min):,} - ${int(j.salary_max):,}" if (j.salary_min and j.salary_max) else None,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            })

    # 2. Fetch Hype Topics
    if pin_type in (None, "", "hype"):
        q_hype = db.query(HypeAnalysis).filter(HypeAnalysis.status != "archived")
        if search:
            s = f"%{search}%"
            q_hype = q_hype.filter(or_(HypeAnalysis.topic.ilike(s), HypeAnalysis.summary.ilike(s)))
        hypes = q_hype.order_by(desc(HypeAnalysis.created_at)).limit(100).all()

        for h in hypes:
            p_id = f"hype-{h.id}"
            is_hid = p_id in hidden_ids
            if only_hidden and not is_hid:
                continue
            items.append({
                "id": p_id,
                "raw_id": h.id,
                "type": "hype",
                "title": h.topic,
                "subtitle": (h.summary[:80] + "...") if h.summary and len(h.summary) > 80 else (h.summary or ""),
                "city": "Global Hub",
                "country": "EU",
                "is_hidden": is_hid,
                "score": h.score,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            })

    # Sort items: hidden first if only_hidden, else by created_at
    total = len(items)
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    paginated = items[offset:offset + limit]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "hidden_count": len(hidden_ids),
    }


@router.post("/pins/{pin_id}/toggle-hide")
def toggle_hide_pin(pin_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Toggles whether a pin is hidden on the live 3D radar and public API.
    """
    hidden_set = _get_hidden_pins(db)
    if pin_id in hidden_set:
        hidden_set.remove(pin_id)
        is_hidden = False
    else:
        hidden_set.add(pin_id)
        is_hidden = True

    _save_hidden_pins(db, hidden_set)
    action_name = "PIN_HIDE" if is_hidden else "PIN_SHOW"
    log_admin_action(
        db,
        action=action_name,
        entity_type="pin",
        entity_id=pin_id,
        details={"is_hidden": is_hidden, "total_hidden": len(hidden_set)},
        request=request,
    )
    return {"id": pin_id, "is_hidden": is_hidden, "total_hidden": len(hidden_set)}


@router.post("/pins/unhide-all")
def unhide_all_pins(request: Request, db: Session = Depends(get_db)):
    """
    Restores visibility for all previously hidden pins.
    """
    hidden_set = _get_hidden_pins(db)
    count = len(hidden_set)
    _save_hidden_pins(db, set())
    log_admin_action(
        db,
        action="PIN_UNHIDE_ALL",
        entity_type="pin",
        details={"restored_count": count},
        request=request,
    )
    return {"message": "All pins restored to visible on live radar", "total_hidden": 0}


@router.post("/pins/bulk-toggle")
def bulk_toggle_pins(
    payload: PinBulkToggleRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Bulk hides or unhides selected pins.
    """
    hidden_set = _get_hidden_pins(db)
    changed = 0
    if payload.action == "hide":
        for pid in payload.pin_ids:
            if pid not in hidden_set:
                hidden_set.add(pid)
                changed += 1
    elif payload.action == "unhide":
        for pid in payload.pin_ids:
            if pid in hidden_set:
                hidden_set.remove(pid)
                changed += 1

    _save_hidden_pins(db, hidden_set)
    action_name = "PIN_BULK_HIDE" if payload.action == "hide" else "PIN_BULK_UNHIDE"
    log_admin_action(
        db,
        action=action_name,
        entity_type="pin",
        details={
            "action": payload.action,
            "affected_count": changed,
            "total_hidden": len(hidden_set),
            "requested_count": len(payload.pin_ids),
        },
        request=request,
    )
    return {
        "action": payload.action,
        "affected_count": changed,
        "total_hidden": len(hidden_set),
        "requested_count": len(payload.pin_ids)
    }

