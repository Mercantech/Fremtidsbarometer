import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from database.models import AdminAuditLog

logger = logging.getLogger("admin_audit")


def log_admin_action(
    db: Session,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> Optional[AdminAuditLog]:
    """
    Records an administrative action in the admin_audit_logs table.
    Captures client IP from X-Forwarded-For or remote socket if request is provided.
    Fails safely without raising exceptions so operational workflows are never blocked.
    """
    try:
        client_ip = None
        if request:
            client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else None)
            if client_ip and "," in client_ip:
                client_ip = client_ip.split(",")[0].strip()

        audit_entry = AdminAuditLog(
            action=action.upper(),
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details or {},
            ip_address=client_ip,
        )
        db.add(audit_entry)
        db.flush()
        logger.info(f"🛡️ Admin action logged: [{action.upper()}] entity={entity_type}:{entity_id} ip={client_ip}")
        return audit_entry
    except Exception as exc:
        logger.warning(f"⚠️ Failed to write admin audit log entry [{action}]: {exc}")
        return None
