from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[schemas.UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    return db.query(models.User).order_by(models.User.username.asc()).all()

@router.post("", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    # Check if username exists
    existing = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with username '{user_in.username}' already exists"
        )
        
    hashed_password = auth.get_password_hash(user_in.password)
    
    db_user = models.User(
        username=user_in.username,
        password_hash=hashed_password,
        role=user_in.role,
        full_name=user_in.full_name,
        email=user_in.email,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Prevent self disabling
    if user_id == current_user.id and user_data.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
        
    # Update fields
    if user_data.full_name is not None:
        db_user.full_name = user_data.full_name
    if user_data.email is not None:
        db_user.email = user_data.email
    if user_data.role is not None:
        # Prevent self role downgrade from admin
        if user_id == current_user.id and db_user.role == "admin" and user_data.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own admin role to another level")
        db_user.role = user_data.role
    if user_data.is_active is not None:
        db_user.is_active = user_data.is_active
    if user_data.password is not None and user_data.password != "":
        db_user.password_hash = auth.get_password_hash(user_data.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Prevent self deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")
        
    # Prevent deleting admin user named 'admin'
    if db_user.username == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The default 'admin' system account cannot be deleted")
        
    # Check if user is referenced by transactions or adjustments
    transactions_in = db.query(models.StockIn).filter(models.StockIn.user_id == user_id).count()
    transactions_out = db.query(models.StockOut).filter(models.StockOut.user_id == user_id).count()
    transfers = db.query(models.StockTransfer).filter(models.StockTransfer.user_id == user_id).count()
    adjustments = db.query(models.InventoryAdjustment).filter(models.InventoryAdjustment.user_id == user_id).count()
    
    if transactions_in > 0 or transactions_out > 0 or transfers > 0 or adjustments > 0:
        # Instead of deleting, system can deactivate
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot delete user because they have registered transaction records. You can deactivate them instead."
        )
        
    db.delete(db_user)
    db.commit()
    return None
