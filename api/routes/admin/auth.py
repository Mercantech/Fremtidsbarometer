import os
import secrets
from typing import Optional
from fastapi import Header, HTTPException, status

def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
):
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin API key is not configured"
        )
    
    token = x_api_key
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token or not secrets.compare_digest(token, admin_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
