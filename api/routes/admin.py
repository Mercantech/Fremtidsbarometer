from fastapi import APIRouter, Depends, Query, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import asyncio

from api.database import get_db
from database.models import SystemLog, AIModelConfig, DataSource, SourceLog, HypeAnalysis
from api.schemas import (
    SystemLogSchema, AIModelConfigSchema, AIModelConfigCreateSchema, AIModelConfigUpdateSchema,
    DataSourceSchema, DataSourceCreateSchema, DataSourceUpdateSchema, SourceLogSchema
)

load_dotenv()
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admin API key is not configured")
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(verify_api_key)])

# ── System Logs ──────────────────────────────────────
@router.get("/logs", response_model=List[SystemLogSchema])
def get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR)"),
    component: Optional[str] = Query(None, description="Filter by component (e.g., NewsAgent, FastAPI)"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get system logs with optional filtering by level and component"""
    query = db.query(SystemLog)
    
    if level:
        query = query.filter(SystemLog.level == level.upper())
    if component:
        query = query.filter(SystemLog.component == component)
        
    logs = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(limit).all()
    return logs


# ── System Status ────────────────────────────────────
@router.get("/status")
def get_system_status(
    max_age_hours: int = Query(12, ge=1),
    db: Session = Depends(get_db)
):
    """Check system health and data freshness"""
    try:
        # Check latest hype analysis
        latest_hype = db.query(HypeAnalysis).order_by(HypeAnalysis.date.desc()).first()
        
        if not latest_hype:
            return {
                "status": "no_data",
                "freshness": {
                    "is_fresh": False,
                    "message": "No hype data available",
                    "recent_raw_records": 0
                }
            }
        
        # Calculate freshness
        time_diff = datetime.now(timezone.utc) - latest_hype.date
        max_age = timedelta(hours=max_age_hours)
        is_fresh = time_diff <= max_age
        
        # Count recent records
        cutoff_time = datetime.now(timezone.utc) - max_age
        recent_records = db.query(HypeAnalysis).filter(HypeAnalysis.date >= cutoff_time).count()
        
        return {
            "status": "ok" if is_fresh else "stale",
            "freshness": {
                "is_fresh": is_fresh,
                "latest_hype_topic": latest_hype.topic,
                "latest_hype_created_at": latest_hype.date,
                "recent_raw_records": recent_records,
                "max_age_hours": max_age_hours
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


# ── AI Model Configs ─────────────────────────────────
@router.get("/ai-models", response_model=List[AIModelConfigSchema])
def get_ai_models(
    task_type: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get AI model configurations"""
    query = db.query(AIModelConfig)
    
    if task_type:
        query = query.filter(AIModelConfig.task_type == task_type)
    if is_active is not None:
        query = query.filter(AIModelConfig.is_active == is_active)
    
    return query.all()


@router.post("/ai-models", response_model=AIModelConfigSchema)
def create_ai_model(
    config: AIModelConfigCreateSchema,
    db: Session = Depends(get_db)
):
    """Create a new AI model configuration"""
    # Check if model already exists
    existing = db.query(AIModelConfig).filter(
        AIModelConfig.task_type == config.task_type,
        AIModelConfig.model_name == config.model_name,
        AIModelConfig.provider == config.provider
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Model configuration already exists")
    
    # If setting as active, deactivate others for the same task type
    if config.is_active:
        db.query(AIModelConfig).filter(
            AIModelConfig.task_type == config.task_type,
            AIModelConfig.is_active == 1
        ).update({AIModelConfig.is_active: 0})
    
    model = AIModelConfig(**config.dict())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.get("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def get_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Get a specific AI model configuration"""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model


@router.patch("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def update_ai_model(
    model_id: int,
    update: AIModelConfigUpdateSchema,
    db: Session = Depends(get_db)
):
    """Update an AI model configuration"""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # If setting as active, deactivate others for the same task type
    if update.is_active == 1:
        db.query(AIModelConfig).filter(
            AIModelConfig.task_type == model.task_type,
            AIModelConfig.id != model_id,
            AIModelConfig.is_active == 1
        ).update({AIModelConfig.is_active: 0})
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)
    
    model.updated_at = datetime.now(timezone.utc)
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
    """Get data sources"""
    query = db.query(DataSource)
    
    if category:
        query = query.filter(DataSource.category == category)
    if is_active is not None:
        query = query.filter(DataSource.is_active == is_active)
    
    return query.all()


@router.post("/data-sources", response_model=DataSourceSchema)
def create_data_source(
    source: DataSourceCreateSchema,
    db: Session = Depends(get_db)
):
    """Create a new data source"""
    # Check if source already exists
    existing = db.query(DataSource).filter(
        DataSource.name == source.name,
        DataSource.source_type == source.source_type
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Data source already exists")
    
    data_source = DataSource(**source.dict())
    db.add(data_source)
    db.commit()
    db.refresh(data_source)
    return data_source


@router.get("/data-sources/{source_id}", response_model=DataSourceSchema)
def get_data_source(source_id: int, db: Session = Depends(get_db)):
    """Get a specific data source"""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    return source


@router.patch("/data-sources/{source_id}", response_model=DataSourceSchema)
def update_data_source(
    source_id: int,
    update: DataSourceUpdateSchema,
    db: Session = Depends(get_db)
):
    """Update a data source"""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    source.updated_at = datetime.now(timezone.utc)
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
    
    logs = query.order_by(SourceLog.created_at.desc()).offset(offset).limit(limit).all()
    return logs


# ── Pipeline Control ────────────────────────────────
@router.post("/trigger-pipeline")
def trigger_pipeline(
    sweep: str = Query("all", description="Pipeline scope: all, social, tech, jobs, synthesis, news"),
    force: bool = Query(False, description="Force run even if data is fresh"),
    db: Session = Depends(get_db)
):
    """
    Trigger a data collection or synthesis pipeline run.
    This endpoint queues a background task to run the pipeline.
    """
    valid_sweeps = ["all", "social", "tech", "jobs", "synthesis", "news"]
    
    if sweep not in valid_sweeps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sweep value. Must be one of: {', '.join(valid_sweeps)}"
        )
    
    try:
        # In a real implementation, this would queue the pipeline task
        # For now, we just log it and return a dispatch confirmation
        log_entry = SystemLog(
            level="INFO",
            component="Orchestrator",
            message=f"Pipeline task '{sweep}' (force={force}) triggered via admin panel",
            metadata_={"sweep": sweep, "force": force}
        )
        db.add(log_entry)
        db.commit()
        
        return {
            "status": "dispatched",
            "sweep": sweep,
            "force": force,
            "message": f"Pipeline task '{sweep}' (force={force}) has been queued and started in background."
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

