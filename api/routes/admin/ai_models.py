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

def _mask_api_key(key: Optional[str]) -> Optional[str]:
    if not key or len(key.strip()) == 0:
        return None
    k = key.strip()
    if len(k) <= 8:
        return "••••••••"
    return f"{k[:4]}••••{k[-4:]}"

def _format_model_response(m: AIModelConfig) -> dict:
    has_custom = bool(m.api_key and len(m.api_key.strip()) > 0)
    return {
        "id": m.id,
        "task_type": m.task_type,
        "model_name": m.model_name,
        "provider": m.provider,
        "is_active": m.is_active,
        "is_fallback": m.is_fallback,
        "has_custom_key": has_custom,
        "masked_key": _mask_api_key(m.api_key) if has_custom else None,
        "created_at": m.created_at
    }

@router.get("/ai-models", response_model=List[AIModelConfigSchema])
def get_ai_models(
    task_type: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all configured AI models with optional filtering."""
    try:
        from sqlalchemy import text
        db.execute(text("ALTER TABLE ai_model_configs ADD COLUMN IF NOT EXISTS api_key VARCHAR(500);"))
        db.commit()
    except Exception:
        db.rollback()

    from database.seeds.ai_models import seed_ai_models, DEPRECATED_MODELS
    has_deprecated_active = db.query(AIModelConfig).filter(
        AIModelConfig.is_active == 1,
        AIModelConfig.model_name.in_(list(DEPRECATED_MODELS))
    ).first()
    if db.query(AIModelConfig).count() == 0 or has_deprecated_active:
        seed_ai_models(db)

    query = db.query(AIModelConfig)
    if task_type:
        query = query.filter(AIModelConfig.task_type == task_type)
    if is_active is not None:
        query = query.filter(AIModelConfig.is_active == is_active)
    models = query.order_by(AIModelConfig.task_type, AIModelConfig.is_active.desc()).all()
    return [_format_model_response(m) for m in models]

@router.post("/ai-models", response_model=AIModelConfigSchema, status_code=status.HTTP_201_CREATED)
def create_ai_model(model_data: AIModelConfigCreateSchema, db: Session = Depends(get_db)):
    """Create a new AI model configuration with optional custom API key."""
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

    data_dict = model_data.dict()
    if data_dict.get("api_key"):
        data_dict["api_key"] = data_dict["api_key"].strip() or None

    new_model = AIModelConfig(**data_dict)
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return _format_model_response(new_model)

@router.get("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def get_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Get a specific AI model configuration."""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return _format_model_response(model)

@router.patch("/ai-models/{model_id}", response_model=AIModelConfigSchema)
def update_ai_model(model_id: int, update: AIModelConfigUpdateSchema, db: Session = Depends(get_db)):
    """Update AI model active/fallback status or custom API key."""
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

    if update.api_key is not None:
        model.api_key = update.api_key.strip() or None
        
    db.commit()
    db.refresh(model)
    return _format_model_response(model)

@router.delete("/ai-models/{model_id}")
def delete_ai_model(model_id: int, db: Session = Depends(get_db)):
    """Delete an AI model configuration."""
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    db.delete(model)
    db.commit()
    return {"message": "Model deleted successfully"}
