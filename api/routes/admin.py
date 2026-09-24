from fastapi import APIRouter, Depends, Query, HTTPException, Header, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import secrets
from datetime import datetime, timezone
from dotenv import load_dotenv

from api.database import get_db
from database.models import SystemLog, AIModelConfig, DataSource, SourceLog
from api.schemas import (
    SystemLogSchema,
    AIModelConfigSchema, AIModelConfigCreateSchema, AIModelConfigUpdateSchema,
    DataSourceSchema, DataSourceCreateSchema, DataSourceUpdateSchema,
    SourceLogSchema
)

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


@router.get("/status")
def get_pipeline_status(
    max_age_hours: int = Query(12, ge=1, le=168, description="Max age in hours for data freshness check"),
    db: Session = Depends(get_db)
):
    """
    Returns data freshness status and recent database statistics for Admin Panel dashboard.
    """
    from agents.orchestrator import check_data_freshness
    freshness = check_data_freshness(db, max_age_hours=max_age_hours)
    return {
        "status": "ok",
        "freshness": freshness
    }


@router.post("/trigger-pipeline")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Set to true to force scraping and AI synthesis even if data is fresh"),
    sweep: Optional[str] = Query("all", description="Sweep type: 'all', 'social', 'tech', 'jobs', 'synthesis', 'news'"),
    db: Session = Depends(get_db)
):
    """
    Manual 'Пуск' trigger for scraping and AI processing.
    Runs asynchronously in the background so the admin UI receives an immediate response.
    """
    from agents.orchestrator import run_full_cycle, run_social_sweep, run_tech_sweep, run_jobs_sweep, run_synthesis
    from agents.news_agent import NewsAgent

    async def _execute_pipeline():
        try:
            if sweep == "all":
                await run_full_cycle(force=force)
            elif sweep == "social":
                await run_social_sweep()
            elif sweep == "tech":
                await run_tech_sweep()
            elif sweep == "jobs":
                await run_jobs_sweep()
            elif sweep == "synthesis":
                await run_synthesis()
            elif sweep == "news":
                await NewsAgent().fetch_news()
        except Exception:
            pass

    background_tasks.add_task(_execute_pipeline)

    return {
        "status": "dispatched",
        "sweep": sweep,
        "force": force,
        "message": f"Pipeline task '{sweep}' (force={force}) has been queued and started in background."
    }


# ── AI Model Configs ─────────────────────────────────
@router.get("/ai-models", response_model=List[AIModelConfigSchema])
def get_ai_models(
    task_type: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all configured AI models with optional filtering"""
    query = db.query(AIModelConfig)
    if task_type:
        query = query.filter(AIModelConfig.task_type == task_type)
    if is_active is not None:
        query = query.filter(AIModelConfig.is_active == is_active)
    return query.order_by(AIModelConfig.task_type, AIModelConfig.is_active.desc()).all()


@router.post("/ai-models", response_model=AIModelConfigSchema, status_code=status.HTTP_201_CREATED)
def create_ai_model(model_data: AIModelConfigCreateSchema, db: Session = Depends(get_db)):
    """Create a new AI model configuration"""
    existing = db.query(AIModelConfig).filter(
        AIModelConfig.task_type == model_data.task_type,
        AIModelConfig.model_name == model_data.model_name,
        AIModelConfig.provider == model_data.provider
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model config already exists")
    
    new_model = AIModelConfig(**model_data.dict())
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model


@router.get("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def get_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Get a specific AI model configuration"""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model


@router.patch("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def update_ai_model(model_id: int, update: AIModelConfigUpdateSchema, db: Session = Depends(get_db)):
    """Update AI model active/fallback status"""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    if update.is_active is not None:
        if update.is_active == 1:
            db.query(AIModelConfig).filter(
                AIModelConfig.task_type == model.task_type,
                AIModelConfig.id != model_id
            ).update({"is_active": 0})
        model.is_active = update.is_active
        
    if update.is_fallback is not None:
        model.is_fallback = update.is_fallback
        
    db.commit()
    db.refresh(model)
    return model


@router.delete("/ai-models/{model_id}")
def delete_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Delete an AI model configuration"""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    db.delete(model)
    db.commit()
    return {"message": "Model deleted successfully"}


# ── Data Sources ─────────────────────────────────────
@router.get("/data-sources", response_model=List[DataSourceSchema])
def get_data_sources(
    category: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all data sources with optional filtering"""
    query = db.query(DataSource)
    if category:
        query = query.filter(DataSource.category == category)
    if is_active is not None:
        query = query.filter(DataSource.is_active == is_active)
    return query.order_by(DataSource.category, DataSource.name).all()


@router.post("/data-sources", response_model=DataSourceSchema, status_code=status.HTTP_201_CREATED)
def create_data_source(source_data: DataSourceCreateSchema, db: Session = Depends(get_db)):
    """Create a new data source"""
    existing = db.query(DataSource).filter(DataSource.url == source_data.url).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Data source URL already exists")
    
    new_source = DataSource(**source_data.dict())
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    return new_source


@router.get("/data-sources/{source_id}", response_model=DataSourceSchema)
def get_data_source(source_id: int, db: Session = Depends(get_db)):
    """Get a specific data source"""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    return source


@router.patch("/data-sources/{source_id}", response_model=DataSourceSchema)
def update_data_source(source_id: int, update: DataSourceUpdateSchema, db: Session = Depends(get_db)):
    """Update a data source"""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    db.commit()
    db.refresh(source)
    return source


@router.delete("/data-sources/{source_id}")
def delete_data_source(source_id: int, db: Session = Depends(get_db)):
    """Delete a data source"""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    db.delete(source)
    db.commit()
    return {"message": "Data source deleted successfully"}


# ── Source Logs ──────────────────────────────────────
@router.get("/source-logs", response_model=List[SourceLogSchema])
def get_source_logs(
    data_source_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get source error logs"""
    query = db.query(SourceLog)
    if data_source_id:
        query = query.filter(SourceLog.data_source_id == data_source_id)
    return query.order_by(SourceLog.created_at.desc()).offset(offset).limit(limit).all()

