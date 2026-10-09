import logging
from database.models import AIModelConfig

logger = logging.getLogger("AIModelSync")

TASK_TYPES = [
    "social_extraction",
    "tech_extraction",
    "jobs_extraction",
    "final_synthesis"
]

DEPRECATED_MODELS = {
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-1.5-pro",
    "models/gemini-1.5-flash",
    "models/gemini-2.0-flash",
}

# Base model specifications for all tasks (gemini-3.8-flash is primary active)
MODEL_TEMPLATES = [
    {"model_name": "gemini-3.8-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
    {"model_name": "gpt-4o-mini", "provider": "openai", "is_active": 0, "is_fallback": 1},
    {"model_name": "open-mistral-nemo", "provider": "mistral", "is_active": 0, "is_fallback": 1},
]

# Generated seed list for backwards compatibility
MODELS_SEED = [
    {**template, "task_type": task}
    for task in TASK_TYPES
    for template in MODEL_TEMPLATES
]


def seed_ai_models(session):
    """
    Intelligently synchronizes AI Model Configurations:
    1. Deactivates deprecated models (gemini-2.5-pro, 1.5-pro/flash, etc.).
    2. Ensures gemini-3.8-flash is present and active for each task.
    3. Ensures fallback models (gpt-4o-mini, open-mistral-nemo) are registered.
    4. Guarantees exactly one active model per task type.
    """
    print("🤖 Synchronizing AI Model Configurations...")
    try:
        # 1. Force deactivate all known deprecated models
        deprecated_records = session.query(AIModelConfig).filter(
            AIModelConfig.model_name.in_(list(DEPRECATED_MODELS))
        ).all()
        for d in deprecated_records:
            if d.is_active != 0 or d.is_fallback != 0:
                d.is_active = 0
                d.is_fallback = 0
                logger.info(f"Deactivated deprecated model '{d.model_name}' for task '{d.task_type}'")

        # Neutralize any database stored api_key values
        session.query(AIModelConfig).update({AIModelConfig.api_key: None}, synchronize_session=False)

        # 2. Synchronize model configurations per task type
        for task in TASK_TYPES:
            existing_models = session.query(AIModelConfig).filter(
                AIModelConfig.task_type == task
            ).all()
            existing_by_name = {m.model_name: m for m in existing_models}

            # Check if there is currently a valid, non-deprecated active model
            current_active = next(
                (m for m in existing_models if m.is_active == 1 and m.model_name not in DEPRECATED_MODELS),
                None
            )

            # Ensure gemini-3.8-flash exists
            flash_model = existing_by_name.get("gemini-3.8-flash")
            if not flash_model:
                flash_model = AIModelConfig(
                    task_type=task,
                    model_name="gemini-3.8-flash",
                    provider="google",
                    is_active=1 if current_active is None else 0,
                    is_fallback=0 if current_active is None else 1
                )
                session.add(flash_model)
                existing_by_name["gemini-3.8-flash"] = flash_model

            # If current active is missing or deprecated, promote gemini-3.8-flash to active
            if current_active is None or current_active.model_name in DEPRECATED_MODELS:
                flash_model.is_active = 1
                flash_model.is_fallback = 0
                current_active = flash_model
                logger.info(f"Set 'gemini-3.8-flash' as active model for task '{task}'")

            # Ensure all other models for this task are not active (avoid multiple active per task)
            for m in existing_models:
                if m.id != current_active.id and m.is_active == 1:
                    m.is_active = 0
                    m.is_fallback = 1
                    logger.info(f"Switched '{m.model_name}' to fallback for task '{task}'")

            # Ensure fallback models exist
            for tmpl in MODEL_TEMPLATES:
                name = tmpl["model_name"]
                if name not in existing_by_name:
                    new_rec = AIModelConfig(
                        task_type=task,
                        model_name=name,
                        provider=tmpl["provider"],
                        is_active=0,
                        is_fallback=1
                    )
                    session.add(new_rec)
                    existing_by_name[name] = new_rec
                elif name != current_active.model_name:
                    rec = existing_by_name[name]
                    if rec.is_active == 0 and rec.is_fallback == 0:
                        rec.is_fallback = 1

        session.commit()
        print("✅ Successfully synchronized AI Model Configurations (gemini-3.8-flash active).")
    except Exception as e:
        session.rollback()
        print(f"❌ Error synchronizing AI Model Configurations: {e}")
        logger.error(f"Error synchronizing AI Model Configurations: {e}", exc_info=True)
