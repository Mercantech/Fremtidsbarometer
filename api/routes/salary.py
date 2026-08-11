from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from database.models import SalaryData
from api.database import get_db
from api.schemas import SalaryDataSchema

router = APIRouter(prefix="/api/salary", tags=["Salary"])

@router.get("/", response_model=List[SalaryDataSchema])
def get_salary(
    country: Optional[str] = Query("DK", description="Country to filter by"),
    technology: Optional[str] = Query(None, description="Technology filter (e.g., Python)"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest salary data.
    """
    # Select the freshest records
    subquery = db.query(
        SalaryData.technology,
        func.max(SalaryData.date).label("max_date")
    ).filter(
        SalaryData.country == country,
        SalaryData.status == 'published'
    ).group_by(SalaryData.technology).subquery()

    query = db.query(SalaryData).join(
        subquery,
        (SalaryData.technology == subquery.c.technology) &
        (SalaryData.date == subquery.c.max_date)
    ).filter(
        SalaryData.country == country,
        SalaryData.status == 'published'
    )

    if technology:
        query = query.filter(SalaryData.technology.ilike(f"%{technology}%"))

    results = query.order_by(SalaryData.median.desc()).all()
    return results

