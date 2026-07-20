from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth
from ..audit_helper import log_action

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[schemas.SupplierOut])
def get_suppliers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(models.Supplier)
    if search:
        query = query.filter(models.Supplier.name.like(f"%{search}%") | models.Supplier.contact_name.like(f"%{search}%"))
    return query.order_by(models.Supplier.name.asc()).all()

@router.post("", response_model=schemas.SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: schemas.SupplierCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    existing = db.query(models.Supplier).filter(models.Supplier.name == supplier.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier with this name already exists")
        
    db_supplier = models.Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    
    log_action(
        db,
        user=current_user,
        action="create",
        resource="suppliers",
        resource_id=str(db_supplier.id),
        details=f"Created supplier '{db_supplier.name}'",
        request=request
    )
    
    return db_supplier

@router.put("/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(
    supplier_id: int,
    supplier_data: schemas.SupplierCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        
    if supplier_data.name != db_supplier.name:
        existing = db.query(models.Supplier).filter(models.Supplier.name == supplier_data.name).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier with this name already exists")
            
    old_name = db_supplier.name
    db_supplier.name = supplier_data.name
    db_supplier.contact_name = supplier_data.contact_name
    db_supplier.phone = supplier_data.phone
    db_supplier.email = supplier_data.email
    db_supplier.address = supplier_data.address
    
    db.commit()
    db.refresh(db_supplier)
    
    log_action(
        db,
        user=current_user,
        action="update",
        resource="suppliers",
        resource_id=str(db_supplier.id),
        details=f"Updated supplier '{old_name}' details (Name changed to '{db_supplier.name}')",
        request=request
    )
    
    return db_supplier

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        
    # Prevent deletion if referenced by any stock_in transaction
    stock_ins_count = db.query(models.StockIn).filter(models.StockIn.supplier_id == supplier_id).count()
    if stock_ins_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete supplier because it is referenced in Stock In transaction history"
        )
        
    sup_id = db_supplier.id
    sup_name = db_supplier.name
    
    db.delete(db_supplier)
    db.commit()
    
    log_action(
        db,
        user=current_user,
        action="delete",
        resource="suppliers",
        resource_id=str(sup_id),
        details=f"Deleted supplier '{sup_name}'",
        request=request
    )
    
    return None

@router.get("/{supplier_id}/purchases", response_model=List[schemas.StockInOut])
def get_supplier_purchases(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        
    stock_ins = db.query(models.StockIn).filter(models.StockIn.supplier_id == supplier_id).order_by(models.StockIn.receive_date.desc()).all()
    
    # Map to schema manually due to nested items requiring specific format
    results = []
    for s_in in stock_ins:
        items = []
        for it in s_in.items:
            items.append(schemas.StockInItemOut(
                id=it.id,
                product_id=it.product_id,
                product_name=it.product.name,
                sku=it.product.sku,
                warehouse_id=it.warehouse_id,
                warehouse_name=it.warehouse.name,
                batch_number=it.batch_number,
                expiry_date=it.expiry_date,
                quantity=it.quantity,
                cost_price=it.cost_price
            ))
        results.append(schemas.StockInOut(
            id=s_in.id,
            transaction_no=s_in.transaction_no,
            supplier_id=s_in.supplier_id,
            supplier_name=s_in.supplier.name,
            receive_date=s_in.receive_date,
            user_id=s_in.user_id,
            username=s_in.user.username,
            total_amount=s_in.total_amount,
            status=s_in.status,
            items=items,
            created_at=s_in.created_at
        ))
    return results
