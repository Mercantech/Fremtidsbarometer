from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.models import Era
from api.database import get_db
from api.schemas import EraSchema

router = APIRouter(prefix="/api/eras", tags=["Eras"])

@router.get("/", response_model=List[EraSchema])
def get_eras(db: Session = Depends(get_db)):
    """
    Returns all eras ordered by year.
    Each era has a flexible `stats` JSONB field containing roles, stack, hype data, etc.
    """
    results = db.query(Era).order_by(Era.year.asc()).all()
    return results
