from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import NewsItem
from api.database import get_db
from api.schemas import NewsItemSchema

router = APIRouter(prefix="/api/news", tags=["News"])

@router.get("/", response_model=List[NewsItemSchema])
def get_news(
    limit: int = Query(15, description="Number of news items to return"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest IT news from the database.
    """
    results = db.query(NewsItem).order_by(NewsItem.created_at.desc()).limit(limit).all()
    return results

