from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import HypeAnalysis
from api.database import get_db
from api.schemas import HypeAnalysisSchema

router = APIRouter(prefix="/api/hype", tags=["Hype"])

@router.get("/", response_model=List[HypeAnalysisSchema])
def get_hype(
    limit: int = Query(10, description="Number of trends to return"),
    db: Session = Depends(get_db)
):
    """
    Returns AI-analyzed hype topics.
    """
    results = db.query(HypeAnalysis)\
        .order_by(HypeAnalysis.created_at.desc())\
        .limit(limit)\
        .all()
    return results

