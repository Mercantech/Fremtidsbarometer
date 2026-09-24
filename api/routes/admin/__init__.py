from fastapi import APIRouter, Depends
from dotenv import load_dotenv

from api.routes.admin.auth import verify_api_key
from api.routes.admin.logs import router as logs_router
from api.routes.admin.pipeline import router as pipeline_router
from api.routes.admin.ai_models import router as ai_models_router
from api.routes.admin.data_sources import router as data_sources_router

load_dotenv()

# Top-level admin router protected with verify_api_key dependency
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(verify_api_key)])

router.include_router(logs_router)
router.include_router(pipeline_router)
router.include_router(ai_models_router)
router.include_router(data_sources_router)

__all__ = ["router", "verify_api_key"]
