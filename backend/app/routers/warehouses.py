from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth
from ..audit_helper import log_action

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])

@router.get("", response_model=List[schemas.WarehouseOut])
def get_warehouses(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(models.Warehouse)
    if search:
        query = query.filter(models.Warehouse.name.like(f"%{search}%") | models.Warehouse.location.like(f"%{search}%"))
    return query.order_by(models.Warehouse.name.asc()).all()

@router.post("", response_model=schemas.WarehouseOut, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse: schemas.WarehouseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    existing = db.query(models.Warehouse).filter(models.Warehouse.name == warehouse.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse with this name already exists")
        
    db_warehouse = models.Warehouse(**warehouse.dict())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    
    log_action(
        db,
        user=current_user,
        action="create",
        resource="warehouses",
        resource_id=str(db_warehouse.id),
        details=f"Created warehouse '{db_warehouse.name}' at '{db_warehouse.location}'",
        request=request
    )
    
    return db_warehouse

@router.put("/{warehouse_id}", response_model=schemas.WarehouseOut)
def update_warehouse(
    warehouse_id: int,
    warehouse_data: schemas.WarehouseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not db_warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
        
    if warehouse_data.name != db_warehouse.name:
        existing = db.query(models.Warehouse).filter(models.Warehouse.name == warehouse_data.name).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse with this name already exists")
            
    old_name = db_warehouse.name
    db_warehouse.name = warehouse_data.name
    db_warehouse.location = warehouse_data.location
    db_warehouse.capacity = warehouse_data.capacity
    
    db.commit()
    db.refresh(db_warehouse)
    
    log_action(
        db,
        user=current_user,
        action="update",
        resource="warehouses",
        resource_id=str(db_warehouse.id),
        details=f"Updated warehouse '{old_name}' details (Name changed to '{db_warehouse.name}')",
        request=request
    )
    
    return db_warehouse

@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(
    warehouse_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not db_warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
        
    # Check if there is active stock in the warehouse
    inventory_count = db.query(models.Inventory).filter(
        models.Inventory.warehouse_id == warehouse_id, 
        models.Inventory.current_stock > 0
    ).count()
    if inventory_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete warehouse while it contains products in stock"
        )
        
    # Check references in transaction tables
    stock_ins = db.query(models.StockInItem).filter(models.StockInItem.warehouse_id == warehouse_id).count()
    stock_outs = db.query(models.StockOutItem).filter(models.StockOutItem.warehouse_id == warehouse_id).count()
    if stock_ins > 0 or stock_outs > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete warehouse because it is referenced in past transaction histories"
        )
        
    wh_id = db_warehouse.id
    wh_name = db_warehouse.name
    
    # Delete empty inventory records first to prevent foreign key errors
    db.query(models.Inventory).filter(models.Inventory.warehouse_id == warehouse_id).delete()
    
    db.delete(db_warehouse)
    db.commit()
    
    log_action(
        db,
        user=current_user,
        action="delete",
        resource="warehouses",
        resource_id=str(wh_id),
        details=f"Deleted warehouse '{wh_name}'",
        request=request
    )
    
    return None
