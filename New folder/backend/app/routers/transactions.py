import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from decimal import Decimal

from ..database import get_db
from .. import models, schemas, auth
from .inventory import check_and_trigger_notifications
from ..audit_helper import log_action

router = APIRouter(prefix="/transactions", tags=["Transactions"])

def generate_tx_no(prefix: str) -> str:
    now = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    rand = random.randint(1000, 9999)
    return f"{prefix}-{now}-{rand}"

# Stock In (Purchase Receiving)
@router.post("/stock-in", response_model=schemas.StockInOut, status_code=status.HTTP_201_CREATED)
def create_stock_in(
    payload: schemas.StockInCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    # Verify supplier
    supplier = db.query(models.Supplier).filter(models.Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        
    tx_no = generate_tx_no("TX-IN")
    
    total_amount = Decimal(0)
    db_items = []
    
    # Process items
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == item.warehouse_id).first()
        if not product or not warehouse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product ID {item.product_id} or Warehouse ID {item.warehouse_id} not found")
            
        if item.quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
            
        # Check warehouse capacity
        total_wh_stock = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.warehouse_id == item.warehouse_id).scalar() or 0
        if total_wh_stock + item.quantity > warehouse.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock In for product '{product.name}' exceeds warehouse '{warehouse.name}' capacity! Available capacity: {warehouse.capacity - total_wh_stock}"
            )
            
        item_cost = Decimal(item.quantity) * item.cost_price
        total_amount += item_cost
        
        # Load or create inventory record
        db_inventory = db.query(models.Inventory).filter(
            models.Inventory.product_id == item.product_id,
            models.Inventory.warehouse_id == item.warehouse_id
        ).first()
        
        if not db_inventory:
            db_inventory = models.Inventory(
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                current_stock=0,
                reserved_stock=0
            )
            db.add(db_inventory)
            db.commit() # commit to generate inventory id
            db.refresh(db_inventory)
            
        # Update current stock
        db_inventory.current_stock += item.quantity
        
        # Update product cost price to latest received cost price
        product.cost_price = item.cost_price
        
        db_item = models.StockInItem(
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            quantity=item.quantity,
            cost_price=item.cost_price
        )
        db_items.append((db_item, db_inventory))
        
    # Create main StockIn record
    db_stock_in = models.StockIn(
        transaction_no=tx_no,
        supplier_id=payload.supplier_id,
        receive_date=payload.receive_date,
        user_id=current_user.id,
        total_amount=total_amount,
        status="completed"
    )
    db.add(db_stock_in)
    db.commit()
    db.refresh(db_stock_in)
    
    # Save items and register movement logs
    for db_item, db_inv in db_items:
        db_item.stock_in_id = db_stock_in.id
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # Log movement
        db_movement = models.InventoryMovement(
            product_id=db_item.product_id,
            warehouse_id=db_item.warehouse_id,
            quantity_changed=db_item.quantity,
            type="stock_in",
            reference_id=db_item.id,
            user_id=current_user.id
        )
        db.add(db_movement)
        db.commit()
        
        # Trigger low stock / alert updates
        check_and_trigger_notifications(db_item.product_id, db)

    log_action(
        db,
        user=current_user,
        action="stock_in",
        resource="transactions",
        resource_id=str(db_stock_in.id),
        details=f"Stock In transaction '{db_stock_in.transaction_no}' from supplier ID {db_stock_in.supplier_id}. Total: {db_stock_in.total_amount}. {len(db_items)} item(s).",
        request=request
    )
        
    return get_stock_in_by_id(db_stock_in.id, db)

# Stock Out (Product Issue)
@router.post("/stock-out", response_model=schemas.StockOutOut, status_code=status.HTTP_201_CREATED)
def create_stock_out(
    payload: schemas.StockOutCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    tx_no = generate_tx_no("TX-OUT")
    
    total_amount = Decimal(0)
    db_items = []
    
    # Process items
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == item.warehouse_id).first()
        if not product or not warehouse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product ID {item.product_id} or Warehouse ID {item.warehouse_id} not found")
            
        if item.quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
            
        # Get stock
        db_inventory = db.query(models.Inventory).filter(
            models.Inventory.product_id == item.product_id,
            models.Inventory.warehouse_id == item.warehouse_id
        ).first()
        
        if not db_inventory or db_inventory.current_stock < item.quantity:
            avail = db_inventory.current_stock if db_inventory else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.name}' in warehouse '{warehouse.name}'. Available: {avail}, Requested: {item.quantity}"
            )
            
        item_revenue = Decimal(item.quantity) * item.selling_price
        total_amount += item_revenue
        
        # Subtract stock
        db_inventory.current_stock -= item.quantity
        
        db_item = models.StockOutItem(
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            quantity=item.quantity,
            selling_price=item.selling_price
        )
        db_items.append((db_item, db_inventory))
        
    # Create main StockOut record
    db_stock_out = models.StockOut(
        transaction_no=tx_no,
        customer_name=payload.customer_name,
        issue_date=payload.issue_date,
        user_id=current_user.id,
        total_amount=total_amount,
        status="completed"
    )
    db.add(db_stock_out)
    db.commit()
    db.refresh(db_stock_out)
    
    # Save items and register movement logs
    for db_item, db_inv in db_items:
        db_item.stock_out_id = db_stock_out.id
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # Log movement (negative since stock went out)
        db_movement = models.InventoryMovement(
            product_id=db_item.product_id,
            warehouse_id=db_item.warehouse_id,
            quantity_changed=-db_item.quantity,
            type="stock_out",
            reference_id=db_item.id,
            user_id=current_user.id
        )
        db.add(db_movement)
        db.commit()
        
        # Trigger notification checks
        check_and_trigger_notifications(db_item.product_id, db)

    log_action(
        db,
        user=current_user,
        action="stock_out",
        resource="transactions",
        resource_id=str(db_stock_out.id),
        details=f"Stock Out transaction '{db_stock_out.transaction_no}' for customer '{db_stock_out.customer_name}'. Total: {db_stock_out.total_amount}. {len(db_items)} item(s).",
        request=request
    )
        
    return get_stock_out_by_id(db_stock_out.id, db)

# Stock Transfer (Between Warehouses)
@router.post("/transfer", response_model=schemas.StockTransferOut, status_code=status.HTTP_201_CREATED)
def create_stock_transfer(
    payload: schemas.StockTransferCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    if payload.source_warehouse_id == payload.destination_warehouse_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination warehouses must be different")
        
    source_wh = db.query(models.Warehouse).filter(models.Warehouse.id == payload.source_warehouse_id).first()
    dest_wh = db.query(models.Warehouse).filter(models.Warehouse.id == payload.destination_warehouse_id).first()
    if not source_wh or not dest_wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source or destination warehouse not found")
        
    tx_no = generate_tx_no("TX-TRF")
    
    db_items = []
    
    # Process transfer items
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product ID {item.product_id} not found")
            
        if item.quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
            
        # Check source inventory
        source_inv = db.query(models.Inventory).filter(
            models.Inventory.product_id == item.product_id,
            models.Inventory.warehouse_id == payload.source_warehouse_id
        ).first()
        
        if not source_inv or source_inv.current_stock < item.quantity:
            avail = source_inv.current_stock if source_inv else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.name}' in source warehouse '{source_wh.name}'. Available: {avail}, Transfer quantity: {item.quantity}"
            )
            
        # Check destination warehouse capacity
        total_dest_stock = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.warehouse_id == payload.destination_warehouse_id).scalar() or 0
        if total_dest_stock + item.quantity > dest_wh.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transferring '{product.name}' exceeds destination warehouse '{dest_wh.name}' capacity! Available capacity: {dest_wh.capacity - total_dest_stock}"
            )
            
        # Load or create destination inventory
        dest_inv = db.query(models.Inventory).filter(
            models.Inventory.product_id == item.product_id,
            models.Inventory.warehouse_id == payload.destination_warehouse_id
        ).first()
        
        if not dest_inv:
            dest_inv = models.Inventory(
                product_id=item.product_id,
                warehouse_id=payload.destination_warehouse_id,
                current_stock=0,
                reserved_stock=0
            )
            db.add(dest_inv)
            db.commit()
            db.refresh(dest_inv)
            
        # Deduct from source and add to destination
        source_inv.current_stock -= item.quantity
        dest_inv.current_stock += item.quantity
        
        db_item = models.StockTransferItem(
            product_id=item.product_id,
            quantity=item.quantity
        )
        db_items.append((db_item, source_inv, dest_inv))
        
    # Create main Transfer
    db_transfer = models.StockTransfer(
        transfer_no=tx_no,
        source_warehouse_id=payload.source_warehouse_id,
        destination_warehouse_id=payload.destination_warehouse_id,
        transfer_date=payload.transfer_date,
        user_id=current_user.id,
        status="completed"
    )
    db.add(db_transfer)
    db.commit()
    db.refresh(db_transfer)
    
    # Save items and register movement logs
    for db_item, src_inv, dst_inv in db_items:
        db_item.stock_transfer_id = db_transfer.id
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # Log movements:
        # 1. Source (negative)
        mov_src = models.InventoryMovement(
            product_id=db_item.product_id,
            warehouse_id=payload.source_warehouse_id,
            quantity_changed=-db_item.quantity,
            type="transfer_out",
            reference_id=db_item.id,
            user_id=current_user.id
        )
        db.add(mov_src)
        
        # 2. Destination (positive)
        mov_dst = models.InventoryMovement(
            product_id=db_item.product_id,
            warehouse_id=payload.destination_warehouse_id,
            quantity_changed=db_item.quantity,
            type="transfer_in",
            reference_id=db_item.id,
            user_id=current_user.id
        )
        db.add(mov_dst)
        db.commit()
        
        # Trigger alerts for products
        check_and_trigger_notifications(db_item.product_id, db)

    log_action(
        db,
        user=current_user,
        action="transfer",
        resource="transactions",
        resource_id=str(db_transfer.id),
        details=f"Stock Transfer '{db_transfer.transfer_no}' from warehouse ID {payload.source_warehouse_id} to warehouse ID {payload.destination_warehouse_id}. {len(db_items)} item(s).",
        request=request
    )
        
    return get_transfer_by_id(db_transfer.id, db)

# Query details helper functions
def get_stock_in_by_id(id: int, db: Session) -> schemas.StockInOut:
    s_in = db.query(models.StockIn).filter(models.StockIn.id == id).first()
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
    return schemas.StockInOut(
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
    )

def get_stock_out_by_id(id: int, db: Session) -> schemas.StockOutOut:
    s_out = db.query(models.StockOut).filter(models.StockOut.id == id).first()
    items = []
    for it in s_out.items:
        items.append(schemas.StockOutItemOut(
            id=it.id,
            product_id=it.product_id,
            product_name=it.product.name,
            sku=it.product.sku,
            warehouse_id=it.warehouse_id,
            warehouse_name=it.warehouse.name,
            quantity=it.quantity,
            selling_price=it.selling_price
        ))
    return schemas.StockOutOut(
        id=s_out.id,
        transaction_no=s_out.transaction_no,
        customer_name=s_out.customer_name,
        issue_date=s_out.issue_date,
        user_id=s_out.user_id,
        username=s_out.user.username,
        total_amount=s_out.total_amount,
        status=s_out.status,
        items=items,
        created_at=s_out.created_at
    )

def get_transfer_by_id(id: int, db: Session) -> schemas.StockTransferOut:
    st = db.query(models.StockTransfer).filter(models.StockTransfer.id == id).first()
    items = []
    for it in st.items:
        items.append(schemas.StockTransferItemOut(
            id=it.id,
            product_id=it.product_id,
            product_name=it.product.name,
            sku=it.product.sku,
            quantity=it.quantity
        ))
    return schemas.StockTransferOut(
        id=st.id,
        transfer_no=st.transfer_no,
        source_warehouse_id=st.source_warehouse_id,
        source_warehouse_name=st.source_warehouse.name,
        destination_warehouse_id=st.destination_warehouse_id,
        destination_warehouse_name=st.destination_warehouse.name,
        transfer_date=st.transfer_date,
        user_id=st.user_id,
        username=st.user.username,
        status=st.status,
        items=items,
        created_at=st.created_at
    )

# Listings
@router.get("/stock-ins", response_model=List[schemas.StockInOut])
def list_stock_ins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    stock_ins = db.query(models.StockIn).order_by(models.StockIn.receive_date.desc()).all()
    results = []
    for s_in in stock_ins:
        results.append(get_stock_in_by_id(s_in.id, db))
    return results

@router.get("/stock-outs", response_model=List[schemas.StockOutOut])
def list_stock_outs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    stock_outs = db.query(models.StockOut).order_by(models.StockOut.issue_date.desc()).all()
    results = []
    for s_out in stock_outs:
        results.append(get_stock_out_by_id(s_out.id, db))
    return results

@router.get("/transfers", response_model=List[schemas.StockTransferOut])
def list_transfers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    transfers = db.query(models.StockTransfer).order_by(models.StockTransfer.transfer_date.desc()).all()
    results = []
    for st in transfers:
        results.append(get_transfer_by_id(st.id, db))
    return results
