from database.models import AIModelConfig

MODELS_SEED = [
    # Social Sweep
    {"task_type": "social_extraction", "model_name": "gemini-1.5-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
    {"task_type": "social_extraction", "model_name": "gpt-4o-mini", "provider": "openai", "is_active": 0, "is_fallback": 1},
    
    # Tech Sweep
    {"task_type": "tech_extraction", "model_name": "gemini-1.5-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
    {"task_type": "tech_extraction", "model_name": "gpt-4o-mini", "provider": "openai", "is_active": 0, "is_fallback": 1},
    
    # Jobs Sweep
    {"task_type": "jobs_extraction", "model_name": "gemini-1.5-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
    {"task_type": "jobs_extraction", "model_name": "gpt-4o-mini", "provider": "openai", "is_active": 0, "is_fallback": 1},
    
    # Final Synthesis
    {"task_type": "final_synthesis", "model_name": "gemini-1.5-pro", "provider": "google", "is_active": 1, "is_fallback": 0},
    {"task_type": "final_synthesis", "model_name": "gemini-1.5-flash", "provider": "google", "is_active": 0, "is_fallback": 1},
]

def seed_ai_models(session):
    """Seeds default AI model configurations."""
    print("🤖 Seeding AI Model Configurations...")
    try:
        for m in MODELS_SEED:
            existing = session.query(AIModelConfig).filter(
                AIModelConfig.task_type == m["task_type"],
                AIModelConfig.model_name == m["model_name"]
            ).first()
            if not existing:
                session.add(AIModelConfig(**m))
        session.commit()
        print("✅ Seeded AI Model Configurations.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding AI Model Configurations: {e}")
