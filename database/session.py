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
    pool_pre_ping=True,  # Check connection liveness before use
    pool_size=10,        # Base pool size
    max_overflow=20      # Surges up to 20 extra connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    """
    Returns a new DB session. 
    Must be used in a context manager or closed manually.
    """
    return SessionLocal()
