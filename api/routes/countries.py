from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.models import TechTrend
from api.database import get_db

router = APIRouter(prefix="/api/countries", tags=["Locations"])

@router.get("/", response_model=List[str])
def get_countries(db: Session = Depends(get_db)):
    """
    Returns a list of available countries with data in the database.
    """
    results = db.query(TechTrend.country).distinct().all()
    
    # Extract values from SQLAlchemy tuples
    countries = [r[0] for r in results if r[0]]
    
    # Add "GLOBAL" if missing, as it is implied
    if "GLOBAL" not in countries:
        countries.insert(0, "GLOBAL")
        
    return countries
