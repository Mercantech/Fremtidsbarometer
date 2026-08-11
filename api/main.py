from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import time
import traceback
from dotenv import load_dotenv
from utils.logger import get_centralized_logger

load_dotenv()

logger = get_centralized_logger("FastAPI")

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Initialize app
app = FastAPI(
    title="Fremtidsbarometer API",
    description="API for the interactive 3D IT trends platform",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from api.routes import trends, news, history, countries, hype, jobs, salary, admin, eras

# Configure CORS
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Don't log normal health check spam
        if request.url.path != "/health":
            logger.info(
                f"{request.method} {request.url.path} - {response.status_code}",
                extra={"metadata": {"latency_ms": round(process_time * 1000, 2), "method": request.method, "path": request.url.path, "status": response.status_code}}
            )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Unhandled Error: {request.method} {request.url.path} - {e}",
            exc_info=True,
            extra={"metadata": {"latency_ms": round(process_time * 1000, 2), "method": request.method, "path": request.url.path, "status": 500}}
        )
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# Include routers
app.include_router(trends.router)
app.include_router(news.router)
app.include_router(history.router)
app.include_router(countries.router)
app.include_router(hype.router)
app.include_router(jobs.router)
app.include_router(salary.router)
app.include_router(admin.router)
app.include_router(eras.router)

@app.get("/")
def read_root():
    return {"message": "Fremtidsbarometer API is running! Go to /docs for Swagger UI."}

@app.get("/health")
def health_check():
    return {"status": "ok"}
