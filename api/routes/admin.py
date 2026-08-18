from fastapi import APIRouter, Depends, Query, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import secrets
from dotenv import load_dotenv

from api.database import get_db
from database.models import SystemLog
from api.schemas import SystemLogSchema

load_dotenv()

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admin API key is not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key, admin_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(verify_api_key)])

@router.get("/logs", response_model=List[SystemLogSchema])
def get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR)"),
    component: Optional[str] = Query(None, description="Filter by component (e.g., NewsAgent, FastAPI)"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(SystemLog)
    
    if level:
        query = query.filter(SystemLog.level == level.upper())
    if component:
        query = query.filter(SystemLog.component == component)
        
    logs = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(limit).all()
    return logs
