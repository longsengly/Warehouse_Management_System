from sqlalchemy.orm import Session
from fastapi import Request
from typing import Optional
from . import models

def log_action(
    db: Session,
    user: Optional[models.User],
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    request: Optional[Request] = None
):
    """
    Logs an action taken by a user onto the audit_logs table.
    This helper catches all internal errors to prevent interrupting the primary request flow.
    """
    try:
        ip_address = None
        if request:
            # Check for standard reverse proxy headers first, then client host
            x_forwarded_for = request.headers.get("x-forwarded-for")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None

        user_id = user.id if user else None
        username = user.username if user else "anonymous"
        role = user.role if user else "anonymous"

        db_log = models.AuditLog(
            user_id=user_id,
            username=username,
            role=role,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        db.add(db_log)
        db.commit()
    except Exception as e:
        # Prevent logging exceptions from failing the main request transaction
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Failed to record audit log: {e}")
