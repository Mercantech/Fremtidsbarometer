from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.models import Era
from database.session import get_db
from api.schemas import EraSchema

router = APIRouter(prefix="/api/eras", tags=["Eras"])

from utils.logger import get_centralized_logger

logger = get_centralized_logger("ErasRoute")

@router.get("", response_model=List[EraSchema], include_in_schema=False)
@router.get("/", response_model=List[EraSchema])
def get_eras(db: Session = Depends(get_db)):
    """
    Returns all eras ordered by year with graceful degradation.
    """
    try:
        return db.query(Era).order_by(Era.year.asc()).all()
    except Exception as e:
        logger.error(f"Error executing get_eras query: {e}")
        db.rollback()
        return []

