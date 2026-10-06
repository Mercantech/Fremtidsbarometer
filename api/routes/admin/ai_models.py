from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import AIModelConfig
from api.schemas import (
    AIModelConfigSchema,
    AIModelConfigCreateSchema,
    AIModelConfigUpdateSchema,
)

router = APIRouter()

@router.get("/ai-models", response_model=List[AIModelConfigSchema])
def get_ai_models(
    task_type: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all configured AI models with optional filtering."""
    query = db.query(AIModelConfig)
    if task_type:
        query = query.filter(AIModelConfig.task_type == task_type)
    if is_active is not None:
        query = query.filter(AIModelConfig.is_active == is_active)
    return query.order_by(AIModelConfig.task_type, AIModelConfig.is_active.desc()).all()

@router.post("/ai-models", response_model=AIModelConfigSchema, status_code=status.HTTP_201_CREATED)
def create_ai_model(model_data: AIModelConfigCreateSchema, db: Session = Depends(get_db)):
    """Create a new AI model configuration."""
    existing = db.query(AIModelConfig).filter(
        AIModelConfig.task_type == model_data.task_type,
        AIModelConfig.model_name == model_data.model_name,
        AIModelConfig.provider == model_data.provider
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model config already exists")
    
    if model_data.is_active == 1:
        db.query(AIModelConfig).filter(
            AIModelConfig.task_type == model_data.task_type
        ).update({"is_active": 0})

    new_model = AIModelConfig(**model_data.dict())
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@router.get("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def get_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Get a specific AI model configuration."""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model

@router.patch("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def update_ai_model(model_id: int, update: AIModelConfigUpdateSchema, db: Session = Depends(get_db)):
    """Update AI model active/fallback status."""
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
    """Delete an AI model configuration."""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    db.delete(model)
    db.commit()
    return {"message": "Model deleted successfully"}
