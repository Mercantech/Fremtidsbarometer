from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from database.models import TechTrend
from api.database import get_db
from api.schemas import TechTrendSchema

router = APIRouter(prefix="/api/trends", tags=["Trends"])

@router.get("/", response_model=List[TechTrendSchema])
def get_trends(
    country: Optional[str] = Query("GLOBAL", description="Country code (e.g. DK, GLOBAL)"),
    limit: int = Query(10, description="Number of top trends to return"),
    db: Session = Depends(get_db)
):
    """
    Returns technological trends for a specified country/globally.
    """
    subquery = db.query(
        TechTrend.technology,
        func.max(TechTrend.date).label("max_date")
    ).filter(TechTrend.country == country).group_by(TechTrend.technology).subquery()

    results = db.query(TechTrend).join(
        subquery,
        (TechTrend.technology == subquery.c.technology) & 
        (TechTrend.date == subquery.c.max_date)
    ).filter(TechTrend.country == country).order_by(TechTrend.popularity.desc()).limit(limit).all()

    return results
