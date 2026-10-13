from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import NewsItem
from database.session import get_db
from api.schemas import NewsItemSchema

router = APIRouter(prefix="/api/news", tags=["News"])

from utils.logger import get_centralized_logger

logger = get_centralized_logger("NewsRoute")

@router.get("", response_model=List[NewsItemSchema], include_in_schema=False)
@router.get("/", response_model=List[NewsItemSchema])
def get_news(
    limit: int = Query(15, description="Number of news items to return"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest IT news from the database with graceful degradation.
    """
    try:
        results = db.query(NewsItem).order_by(NewsItem.created_at.desc()).limit(limit).all()
        return results
    except Exception as e:
        logger.error(f"Error executing get_news query: {e}")
        db.rollback()
        return []

