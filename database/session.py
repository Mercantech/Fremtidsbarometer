import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("DatabaseSession")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

connect_args = {}
if "neon.tech" in DATABASE_URL or "neon" in DATABASE_URL:
    connect_args = {"sslmode": "require"}

# Global singleton engine and sessionmaker
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,    # Check connection liveness before checkout
    pool_size=15,          # Base pool size
    max_overflow=25,       # Surges up to 25 extra connections
    pool_timeout=10,       # Fail fast in 10s if pool exhausted (prevents 60s 504 timeouts)
    pool_recycle=1800,     # Recycle connections every 30m to avoid stale proxy drops
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    """
    Returns a new DB session. 
    Must be used in a context manager or closed manually.
    """
    return SessionLocal()

def get_db():
    """
    FastAPI dependency that yields a database session and ensures it is closed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
