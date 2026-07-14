import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date

from ..database import get_db
from .. import models, schemas, auth
from ..config import settings

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[schemas.ProductOut])
def get_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(
        models.Product.id,
        models.Product.sku,
        models.Product.barcode,
        models.Product.name,
        models.Product.description,
        models.Product.category_id,
        models.Product.cost_price,
        models.Product.selling_price,
        models.Product.min_stock,
        models.Product.unit,
        models.Product.image_url,
        models.Product.expiry_date,
        models.Product.created_at,
        models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Product.category_id == models.Category.id)
    
    if search:
        query = query.filter(
            models.Product.name.like(f"%{search}%") | 
            models.Product.sku.like(f"%{search}%") | 
            models.Product.barcode.like(f"%{search}%")
        )
        
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
        
    if low_stock:
        # Filter where total stock across all warehouses is less than min_stock
        # Standard query logic: we can fetch all products and filter in Python or use a subquery. 
        # A subquery is cleaner. Let's do it in python or simple subquery.
        # Actually, let's write a simple filter since it's easier to maintain.
        pass

    products = query.order_by(models.Product.name.asc()).all()
    
    if low_stock:
        # Filter products whose sum of current stock is less than min_stock
        filtered_products = []
        for p in products:
            total_stock = db.query(models.Inventory.current_stock).filter(models.Inventory.product_id == p.id).all()
            stock_sum = sum([item[0] for item in total_stock])
            if stock_sum < p.min_stock:
                filtered_products.append(p)
        return filtered_products

    return products

@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    # Check duplicate SKU
    existing = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists"
        )
        
    # Check category exists if provided
    if product.category_id:
        category = db.query(models.Category).filter(models.Category.id == product.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")
            
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Initialize empty inventory entries for all existing warehouses
    warehouses = db.query(models.Warehouse).all()
    for wh in warehouses:
        db_inv = models.Inventory(product_id=db_product.id, warehouse_id=wh.id, current_stock=0, reserved_stock=0)
        db.add(db_inv)
    db.commit()
    
    # Return with category_name mapping
    res = db.query(
        models.Product.id,
        models.Product.sku,
        models.Product.barcode,
        models.Product.name,
        models.Product.description,
        models.Product.category_id,
        models.Product.cost_price,
        models.Product.selling_price,
        models.Product.min_stock,
        models.Product.unit,
        models.Product.image_url,
        models.Product.expiry_date,
        models.Product.created_at,
        models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Product.category_id == models.Category.id).filter(models.Product.id == db_product.id).first()
    
    return res

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    product_data: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    # Check unique SKU if changed
    if product_data.sku and product_data.sku != db_product.sku:
        existing = db.query(models.Product).filter(models.Product.sku == product_data.sku).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product with SKU '{product_data.sku}' already exists")
            
    # Check category
    if product_data.category_id:
        category = db.query(models.Category).filter(models.Category.id == product_data.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")
            
    # Update fields
    for key, val in product_data.dict(exclude_unset=True).items():
        setattr(db_product, key, val)
        
    db.commit()
    db.refresh(db_product)
    
    res = db.query(
        models.Product.id,
        models.Product.sku,
        models.Product.barcode,
        models.Product.name,
        models.Product.description,
        models.Product.category_id,
        models.Product.cost_price,
        models.Product.selling_price,
        models.Product.min_stock,
        models.Product.unit,
        models.Product.image_url,
        models.Product.expiry_date,
        models.Product.created_at,
        models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Product.category_id == models.Category.id).filter(models.Product.id == db_product.id).first()
    
    return res

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    # Directly delete inventory records for the product
    db.query(models.Inventory).filter(models.Inventory.product_id == product_id).delete()
    
    # Delete the product itself regardless of transaction history
    # Note: This bypasses safety checks; ensure this is acceptable for your use case
    
    db.delete(db_product)
    db.commit()
    return None

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Generate unique name
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return file url (relative static url)
    return {"image_url": f"/static/uploads/{filename}"}
