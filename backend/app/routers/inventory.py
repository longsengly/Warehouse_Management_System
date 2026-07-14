from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth
from ..audit_helper import log_action

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

def check_and_trigger_notifications(product_id: int, db: Session):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        return
        
    # Get total stock across all warehouses
    total_stock_query = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.product_id == product_id).scalar()
    total_stock = total_stock_query if total_stock_query is not None else 0
    
    # Check Out of Stock
    if total_stock <= 0:
        existing = db.query(models.Notification).filter(
            models.Notification.product_id == product_id,
            models.Notification.type == "out_of_stock",
            models.Notification.is_read == False
        ).first()
        if not existing:
            new_notif = models.Notification(
                message=f"Product '{product.name}' (SKU: {product.sku}) is completely out of stock!",
                type="out_of_stock",
                product_id=product_id
            )
            db.add(new_notif)
            
    # Check Low Stock
    elif total_stock <= product.min_stock:
        existing = db.query(models.Notification).filter(
            models.Notification.product_id == product_id,
            models.Notification.type == "low_stock",
            models.Notification.is_read == False
        ).first()
        if not existing:
            new_notif = models.Notification(
                message=f"Product '{product.name}' (SKU: {product.sku}) has low stock! Current: {total_stock} {product.unit} (Min: {product.min_stock})",
                type="low_stock",
                product_id=product_id
            )
            db.add(new_notif)
            
    # Check if expiring soon
    if product.expiry_date:
        import datetime
        days_left = (product.expiry_date - datetime.date.today()).days
        if 0 < days_left <= 30: # Expiring in 30 days
            existing = db.query(models.Notification).filter(
                models.Notification.product_id == product_id,
                models.Notification.type == "expiring_soon",
                models.Notification.is_read == False
            ).first()
            if not existing:
                new_notif = models.Notification(
                    message=f"Product '{product.name}' (SKU: {product.sku}) is expiring soon on {product.expiry_date}! ({days_left} days left)",
                    type="expiring_soon",
                    product_id=product_id
                )
                db.add(new_notif)
                
    db.commit()

@router.get("", response_model=List[schemas.InventoryOut])
def get_inventory(
    search: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(
        models.Inventory.id,
        models.Inventory.product_id,
        models.Product.name.label("product_name"),
        models.Product.sku.label("sku"),
        models.Product.unit.label("unit"),
        models.Inventory.warehouse_id,
        models.Warehouse.name.label("warehouse_name"),
        models.Inventory.current_stock,
        models.Inventory.reserved_stock,
        models.Product.min_stock.label("min_stock"),
        models.Inventory.created_at
    ).join(models.Product, models.Inventory.product_id == models.Product.id)\
     .join(models.Warehouse, models.Inventory.warehouse_id == models.Warehouse.id)
     
    if search:
        query = query.filter(
            models.Product.name.like(f"%{search}%") | 
            models.Product.sku.like(f"%{search}%") | 
            models.Product.barcode.like(f"%{search}%")
        )
        
    if warehouse_id:
        query = query.filter(models.Inventory.warehouse_id == warehouse_id)
        
    return query.order_by(models.Product.name.asc()).all()

@router.post("/adjust", response_model=schemas.InventoryAdjustmentOut)
def adjust_inventory(
    adjustment: schemas.InventoryAdjustmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_inventory = db.query(models.Inventory).filter(
        models.Inventory.product_id == adjustment.product_id,
        models.Inventory.warehouse_id == adjustment.warehouse_id
    ).first()
    
    if not db_inventory:
        product = db.query(models.Product).filter(models.Product.id == adjustment.product_id).first()
        warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == adjustment.warehouse_id).first()
        if not product or not warehouse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product or Warehouse not found")
        db_inventory = models.Inventory(
            product_id=adjustment.product_id,
            warehouse_id=adjustment.warehouse_id,
            current_stock=0,
            reserved_stock=0
        )
        db.add(db_inventory)
        db.commit()
        db.refresh(db_inventory)
        
    qty_changed = adjustment.quantity
    if adjustment.type == "decrease":
        if db_inventory.current_stock < adjustment.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock to decrease. Current stock: {db_inventory.current_stock}"
            )
        db_inventory.current_stock -= adjustment.quantity
        qty_changed = -adjustment.quantity
    elif adjustment.type == "increase":
        total_wh_stock = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.warehouse_id == adjustment.warehouse_id).scalar() or 0
        warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == adjustment.warehouse_id).first()
        if total_wh_stock + adjustment.quantity > warehouse.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adjustment exceeds warehouse capacity! Remaining capacity: {warehouse.capacity - total_wh_stock}"
            )
        db_inventory.current_stock += adjustment.quantity
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment type")
        
    db_adjustment = models.InventoryAdjustment(
        product_id=adjustment.product_id,
        warehouse_id=adjustment.warehouse_id,
        user_id=current_user.id,
        type=adjustment.type,
        quantity=adjustment.quantity,
        reason=adjustment.reason
    )
    db.add(db_adjustment)
    db.commit()
    db.refresh(db_adjustment)
    
    db_movement = models.InventoryMovement(
        product_id=adjustment.product_id,
        warehouse_id=adjustment.warehouse_id,
        quantity_changed=qty_changed,
        type="adjustment",
        reference_id=db_adjustment.id,
        user_id=current_user.id
    )
    db.add(db_movement)
    db.commit()

    # Fetch product/warehouse names for the audit log details
    _product = db.query(models.Product).filter(models.Product.id == adjustment.product_id).first()
    _warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == adjustment.warehouse_id).first()
    log_action(
        db,
        user=current_user,
        action="adjust",
        resource="inventory",
        resource_id=str(db_adjustment.id),
        details=f"Inventory {adjustment.type} of {adjustment.quantity} units for product '{_product.name if _product else adjustment.product_id}' in warehouse '{_warehouse.name if _warehouse else adjustment.warehouse_id}'. Reason: {adjustment.reason}",
        request=request
    )
    
    check_and_trigger_notifications(adjustment.product_id, db)
    
    res = db.query(
        models.InventoryAdjustment.id,
        models.InventoryAdjustment.product_id,
        models.Product.name.label("product_name"),
        models.InventoryAdjustment.warehouse_id,
        models.Warehouse.name.label("warehouse_name"),
        models.InventoryAdjustment.user_id,
        models.User.username.label("username"),
        models.InventoryAdjustment.type,
        models.InventoryAdjustment.quantity,
        models.InventoryAdjustment.reason,
        models.InventoryAdjustment.created_at
    ).join(models.Product, models.InventoryAdjustment.product_id == models.Product.id)\
     .join(models.Warehouse, models.InventoryAdjustment.warehouse_id == models.Warehouse.id)\
     .join(models.User, models.InventoryAdjustment.user_id == models.User.id)\
     .filter(models.InventoryAdjustment.id == db_adjustment.id).first()
     
    return res

@router.get("/movements", response_model=List[schemas.InventoryMovementOut])
def get_movements(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(
        models.InventoryMovement.id,
        models.InventoryMovement.product_id,
        models.Product.name.label("product_name"),
        models.Product.sku.label("sku"),
        models.InventoryMovement.warehouse_id,
        models.Warehouse.name.label("warehouse_name"),
        models.InventoryMovement.quantity_changed,
        models.InventoryMovement.type,
        models.InventoryMovement.reference_id,
        models.InventoryMovement.user_id,
        models.User.username.label("username"),
        models.InventoryMovement.created_at
    ).join(models.Product, models.InventoryMovement.product_id == models.Product.id)\
     .join(models.Warehouse, models.InventoryMovement.warehouse_id == models.Warehouse.id)\
     .join(models.User, models.InventoryMovement.user_id == models.User.id)
     
    if product_id:
        query = query.filter(models.InventoryMovement.product_id == product_id)
    if warehouse_id:
        query = query.filter(models.InventoryMovement.warehouse_id == warehouse_id)
        
    return query.order_by(models.InventoryMovement.created_at.desc()).all()

@router.get("/adjustments", response_model=List[schemas.InventoryAdjustmentOut])
def get_adjustments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    adjustments = db.query(
        models.InventoryAdjustment.id,
        models.InventoryAdjustment.product_id,
        models.Product.name.label("product_name"),
        models.InventoryAdjustment.warehouse_id,
        models.Warehouse.name.label("warehouse_name"),
        models.InventoryAdjustment.user_id,
        models.User.username.label("username"),
        models.InventoryAdjustment.type,
        models.InventoryAdjustment.quantity,
        models.InventoryAdjustment.reason,
        models.InventoryAdjustment.created_at
    ).join(models.Product, models.InventoryAdjustment.product_id == models.Product.id)\
     .join(models.Warehouse, models.InventoryAdjustment.warehouse_id == models.Warehouse.id)\
     .join(models.User, models.InventoryAdjustment.user_id == models.User.id)\
     .order_by(models.InventoryAdjustment.created_at.desc()).all()
     
    return adjustments
