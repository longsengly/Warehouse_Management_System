from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth
from .inventory import check_and_trigger_all_notifications
from ..telegram_service import test_telegram_connection

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/telegram-test")
async def test_telegram(
    current_user: models.User = Depends(auth.require_admin)
):
    """Test the Telegram bot connection (admin only). Sends a test message to the configured chat."""
    result = await test_telegram_connection()
    return result

@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    check_and_trigger_all_notifications(db)
    query = db.query(
        models.Notification.id,
        models.Notification.message,
        models.Notification.type,
        models.Notification.product_id,
        models.Product.name.label("product_name"),
        models.Notification.is_read,
        models.Notification.created_at
    ).outerjoin(models.Product, models.Notification.product_id == models.Product.id)
    
    if unread_only:
        query = query.filter(models.Notification.is_read == False)
        
    return query.order_by(models.Notification.created_at.desc()).all()

@router.put("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    db.query(models.Notification).filter(models.Notification.is_read == False).update({models.Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.put("/{notification_id}", response_model=schemas.NotificationOut)
def update_notification(
    notification_id: int,
    payload: schemas.NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    db_notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not db_notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        
    db_notif.is_read = payload.is_read
    db.commit()
    
    res = db.query(
        models.Notification.id,
        models.Notification.message,
        models.Notification.type,
        models.Notification.product_id,
        models.Product.name.label("product_name"),
        models.Notification.is_read,
        models.Notification.created_at
    ).outerjoin(models.Product, models.Notification.product_id == models.Product.id)\
     .filter(models.Notification.id == notification_id).first()
     
    return res
