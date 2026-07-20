from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    username: Optional[str] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    query = db.query(models.AuditLog)

    if username:
        query = query.filter(models.AuditLog.username.like(f"%{username}%"))
    if action:
        query = query.filter(models.AuditLog.action == action)
    if resource:
        query = query.filter(models.AuditLog.resource == resource)
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.AuditLog.created_at >= start)
        except ValueError:
            pass
    if end_date:
        try:
            # Include the entire end day
            end = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(models.AuditLog.created_at <= end)
        except ValueError:
            pass

    return query.order_by(models.AuditLog.created_at.desc()).offset(offset).limit(limit).all()
