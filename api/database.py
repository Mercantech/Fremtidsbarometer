from typing import Generator
from database.session import get_session
from sqlalchemy.orm import Session

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency to get a database session.
    Automatically closes the session after the request finishes.
    """
    db = get_session()
    try:
        yield db
    finally:
        db.close()
