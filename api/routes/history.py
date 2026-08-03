from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database.models import TechTrend
from api.database import get_db
from api.schemas import TrendHistoryYearSchema

router = APIRouter(prefix="/api/trends/history", tags=["Trends"])

@router.get("/", response_model=List[TrendHistoryYearSchema])
def get_trends_history(
    country: Optional[str] = Query("GLOBAL", description="Country to filter by"),
    start_year: int = Query(1960, description="Start year"),
    end_year: int = Query(2025, description="End year"),
    db: Session = Depends(get_db)
):
    """
    Returns historical trend data for the graph (TimeSlider).
    """
    start_date = datetime(start_year, 1, 1)
    end_date = datetime(end_year, 12, 31)

    results = db.query(TechTrend)\
        .filter(TechTrend.country == country)\
        .filter(TechTrend.date >= start_date)\
        .filter(TechTrend.date <= end_date)\
        .order_by(TechTrend.date.asc())\
        .all()

    history_by_year = {}
    for r in results:
        year = r.date.year
        if year not in history_by_year:
            history_by_year[year] = []
        
        history_by_year[year].append({
            "technology": r.technology,
            "popularity": r.popularity,
            "mentions": r.mentions or 0
        })

    return [
        {"year": year, "data": data}
        for year, data in sorted(history_by_year.items())
    ]

