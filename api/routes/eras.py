from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.models import Era
from database.session import get_db
from api.schemas import EraSchema

router = APIRouter(prefix="/api/eras", tags=["Eras"])

@router.get("", response_model=List[EraSchema], include_in_schema=False)
@router.get("/", response_model=List[EraSchema])
def get_eras(db: Session = Depends(get_db)):
    """
    Returns all eras ordered by year.
    Each era has a flexible `stats` JSONB field containing roles, stack, hype data, etc.
    Automatically populates default historical eras if the table is empty.
    """
    results = db.query(Era).order_by(Era.year.asc()).all()
    if not results:
        from database.seeds.eras import seed_eras
        seed_eras(db)
        results = db.query(Era).order_by(Era.year.asc()).all()
    return results
