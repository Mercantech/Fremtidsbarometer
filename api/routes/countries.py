from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.models import TechTrend, JobPosting, SalaryData
from api.database import get_db

router = APIRouter(prefix="/api/countries", tags=["Locations"])

@router.get("", response_model=List[str], include_in_schema=False)
@router.get("/", response_model=List[str])
def get_countries(db: Session = Depends(get_db)):
    """
    Returns a list of available countries with data in the database.
    """
    trend_countries = [r[0] for r in db.query(TechTrend.country).distinct().all() if r[0]]
    job_countries = [r[0] for r in db.query(JobPosting.country).distinct().all() if r[0]]
    salary_countries = [r[0] for r in db.query(SalaryData.country).distinct().all() if r[0]]
    
    all_countries = set(trend_countries + job_countries + salary_countries)
    all_countries.discard("GLOBAL")
    sorted_countries = sorted(list(all_countries))
    return ["GLOBAL"] + sorted_countries
