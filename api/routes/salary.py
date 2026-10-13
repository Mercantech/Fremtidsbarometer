from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from database.models import SalaryData
from database.session import get_db
from api.schemas import SalaryDataSchema

from utils.logger import get_centralized_logger

logger = get_centralized_logger("SalaryRoute")

router = APIRouter(prefix="/api/salary", tags=["salary"])

@router.get("", response_model=List[SalaryDataSchema], include_in_schema=False)
@router.get("/", response_model=List[SalaryDataSchema])
def get_salary(
    country: Optional[str] = Query(None, description="Country filter (e.g., DK, US). If omitted, returns latest benchmarks across all countries."),
    technology: Optional[str] = Query(None, description="Technology filter (e.g., Python)"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest salary benchmarks with graceful degradation.
    """
    try:
        base_subquery = db.query(
            SalaryData.technology,
            SalaryData.country,
            func.max(SalaryData.date).label("max_date")
        ).filter(
            SalaryData.status == 'published'
        )

        if country:
            base_subquery = base_subquery.filter(SalaryData.country == country)

        subquery = base_subquery.group_by(SalaryData.technology, SalaryData.country).subquery()

        query = db.query(SalaryData).join(
            subquery,
            (SalaryData.technology == subquery.c.technology) &
            (SalaryData.country == subquery.c.country) &
            (SalaryData.date == subquery.c.max_date)
        ).filter(
            SalaryData.status == 'published'
        )

        if country:
            query = query.filter(SalaryData.country == country)

        if technology:
            query = query.filter(SalaryData.technology.ilike(f"%{technology}%"))

        results = query.order_by(SalaryData.median.desc()).all()
        return results
    except Exception as e:
        logger.error(f"Error executing get_salary query: {e}")
        db.rollback()
        return []

