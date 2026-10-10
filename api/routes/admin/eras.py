from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import Era
from api.schemas import EraSchema, EraCreateSchema, EraUpdateSchema
from api.services.audit_logger import log_admin_action

router = APIRouter()


@router.get("/eras", response_model=List[EraSchema])
def list_admin_eras(db: Session = Depends(get_db)):
    """
    Returns all eras from the database ordered chronologically by year.
    """
    return db.query(Era).order_by(Era.year.asc()).all()


@router.post("/eras", response_model=EraSchema, status_code=status.HTTP_201_CREATED)
def create_admin_era(payload: EraCreateSchema, request: Request, db: Session = Depends(get_db)):
    """
    Creates a new historical or future IT era.
    Validates that the year is unique.
    """
    existing = db.query(Era).filter(Era.year == payload.year).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An era with year {payload.year} already exists (ID {existing.id}: {existing.title})"
        )

    era = Era(
        year=payload.year,
        title=payload.title,
        subtitle=payload.subtitle,
        stats=payload.stats or {},
    )
    db.add(era)
    db.commit()
    db.refresh(era)

    log_admin_action(
        db,
        action="ERA_CREATE",
        entity_type="era",
        entity_id=str(era.id),
        details={"year": era.year, "title": era.title},
        request=request,
    )
    return era


@router.get("/eras/{era_id}", response_model=EraSchema)
def get_admin_era(era_id: int, db: Session = Depends(get_db)):
    """
    Returns details of a specific era by ID.
    """
    era = db.query(Era).filter(Era.id == era_id).first()
    if not era:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Era not found")
    return era


@router.put("/eras/{era_id}", response_model=EraSchema)
def update_admin_era(era_id: int, payload: EraUpdateSchema, request: Request, db: Session = Depends(get_db)):
    """
    Updates an existing era's year, title, subtitle, or stats payload.
    """
    era = db.query(Era).filter(Era.id == era_id).first()
    if not era:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Era not found")

    if payload.year is not None and payload.year != era.year:
        year_conflict = db.query(Era).filter(Era.year == payload.year, Era.id != era_id).first()
        if year_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Year {payload.year} is already taken by era '{year_conflict.title}'"
            )
        era.year = payload.year

    if payload.title is not None:
        era.title = payload.title

    if payload.subtitle is not None:
        era.subtitle = payload.subtitle

    if payload.stats is not None:
        # Shallow merge or replace stats JSONB
        era.stats = payload.stats

    db.commit()
    db.refresh(era)

    log_admin_action(
        db,
        action="ERA_UPDATE",
        entity_type="era",
        entity_id=str(era.id),
        details={"year": era.year, "title": era.title},
        request=request,
    )
    return era


@router.delete("/eras/{era_id}", status_code=status.HTTP_200_OK)
def delete_admin_era(era_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Deletes an era from the database.
    """
    era = db.query(Era).filter(Era.id == era_id).first()
    if not era:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Era not found")

    year = era.year
    title = era.title
    db.delete(era)
    db.commit()

    log_admin_action(
        db,
        action="ERA_DELETE",
        entity_type="era",
        entity_id=str(era_id),
        details={"year": year, "title": title},
        request=request,
    )
    return {"status": "deleted", "id": era_id, "year": year, "title": title}


@router.post("/eras/reset-defaults", response_model=List[EraSchema])
def reset_default_eras(request: Request, db: Session = Depends(get_db)):
    """
    Explicitly forces re-synchronization with default seed eras.
    """
    from database.seeds.eras import seed_eras
    seed_eras(db, force=True)

    log_admin_action(
        db,
        action="ERA_RESET_DEFAULTS",
        entity_type="era",
        details={"action": "reset_to_seeds"},
        request=request,
    )
    return db.query(Era).order_by(Era.year.asc()).all()
