from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, cast, String

from database.session import get_session
from database.models import AdminAuditLog
from api.schemas import AdminAuditLogListResponse, AdminAuditLogSchema

router = APIRouter(prefix="/audit-logs", tags=["admin-audit"])


@router.get("", response_model=AdminAuditLogListResponse)
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name (e.g. PIN_HIDE, JOB_DELETE)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. pin, job, broadcast_pin)"),
    search: Optional[str] = Query(None, description="Search across entity ID or payload"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_session)
):
    """
    Returns paginated audit trail of all administrative actions.
    Supports filtering by action, entity_type, and search query.
    """
    query = db.query(AdminAuditLog)

    if action:
        query = query.filter(AdminAuditLog.action == action.upper())

    if entity_type:
        query = query.filter(AdminAuditLog.entity_type == entity_type.lower())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AdminAuditLog.action.ilike(search_term),
                AdminAuditLog.entity_id.ilike(search_term),
                cast(AdminAuditLog.details, String).ilike(search_term),
                AdminAuditLog.ip_address.ilike(search_term),
            )
        )

    total = query.count()
    items = (
        query.order_by(desc(AdminAuditLog.created_at), desc(AdminAuditLog.id))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return AdminAuditLogListResponse(
        items=[AdminAuditLogSchema.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )
