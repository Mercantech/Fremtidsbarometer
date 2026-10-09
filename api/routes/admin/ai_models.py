from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.session import get_db
from database.models import AIModelConfig
from api.schemas import (
    AIModelConfigSchema,
    AIModelConfigCreateSchema,
    AIModelConfigUpdateSchema,
    ProviderStatusSchema,
)
from agents.ai_provider import check_provider_key_present, verify_provider_keys

router = APIRouter()


def _format_model_response(m: AIModelConfig) -> dict:
    env_var, is_present = check_provider_key_present(m.provider)
    return {
        "id": m.id,
        "task_type": m.task_type,
        "model_name": m.model_name,
        "provider": m.provider,
        "is_active": m.is_active,
        "is_fallback": m.is_fallback,
        "env_key_present": is_present,
        "env_var": env_var,
        "created_at": m.created_at,
    }


@router.get("/ai-models/providers-status", response_model=List[ProviderStatusSchema])
def get_providers_status(db: Session = Depends(get_db)):
    """
    Returns the configuration status (present/missing in .env) for ALL AI providers
    configured in the system, including active and fallback models.
    Never returns secret keys.
    """
    return verify_provider_keys(db)


@router.get("/ai-models", response_model=List[AIModelConfigSchema])
def get_ai_models(
    task_type: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all configured AI models with optional filtering."""
    try:
        # Neutralize any legacy database api_key values
        db.execute(text("UPDATE ai_model_configs SET api_key = NULL WHERE api_key IS NOT NULL;"))
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
    """Create a new AI model configuration. API keys reside strictly in environment variables (.env)."""
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

    new_model = AIModelConfig(
        task_type=model_data.task_type,
        model_name=model_data.model_name.strip(),
        provider=model_data.provider.strip().lower(),
        is_active=model_data.is_active,
        is_fallback=model_data.is_fallback,
        api_key=None
    )
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

    # Guarantee api_key stays NULL
    model.api_key = None
        
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
