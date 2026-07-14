import os
import shutil
import uuid
import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from ..database import get_db
from .. import models, schemas, auth
from ..config import settings
from ..audit_helper import log_action

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
    request: Request,
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
    
    log_action(
        db,
        user=current_user,
        action="create",
        resource="products",
        resource_id=str(db_product.id),
        details=f"Created product '{db_product.name}' with SKU '{db_product.sku}'",
        request=request
    )
    
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
    request: Request,
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
    
    log_action(
        db,
        user=current_user,
        action="update",
        resource="products",
        resource_id=str(db_product.id),
        details=f"Updated product '{db_product.name}' (SKU: {db_product.sku})",
        request=request
    )
    
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
    request: Request,
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
    prod_id = db_product.id
    prod_name = db_product.name
    prod_sku = db_product.sku
    
    db.delete(db_product)
    db.commit()
    
    log_action(
        db,
        user=current_user,
        action="delete",
        resource="products",
        resource_id=str(prod_id),
        details=f"Deleted product '{prod_name}' (SKU: {prod_sku})",
        request=request
    )
    
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

@router.get("/export/excel")
def export_products_excel(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Products Catalog"
    
    # Styles
    title_font = Font(name="Segoe UI", size=16, bold=True, color="1F497D")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    right_align = Alignment(horizontal="right", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    
    # Add title block
    ws.merge_cells("A1:J1")
    ws["A1"] = "Warehouse Management System - Product Catalog"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 40
    
    ws["A2"] = f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ws["A2"].font = Font(name="Segoe UI", size=10, italic=True)
    ws.row_dimensions[2].height = 20
    ws.append([]) # Blank row
    
    headers = [
        "SKU *",
        "Barcode",
        "Product Name *",
        "Description",
        "Category *",
        "Cost Price *",
        "Selling Price *",
        "Min Stock Alert",
        "Unit of Measure",
        "Expiry Date (YYYY-MM-DD)"
    ]
    ws.append(headers)
    ws.row_dimensions[4].height = 25
    
    # Apply header formatting
    for col_num in range(1, 11):
        cell = ws.cell(row=4, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        
    products = db.query(
        models.Product.sku,
        models.Product.barcode,
        models.Product.name,
        models.Product.description,
        models.Product.cost_price,
        models.Product.selling_price,
        models.Product.min_stock,
        models.Product.unit,
        models.Product.expiry_date,
        models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Product.category_id == models.Category.id).order_by(models.Product.name.asc()).all()
    
    for row_num, item in enumerate(products, 5):
        expiry_str = item.expiry_date.strftime("%Y-%m-%d") if item.expiry_date else ""
        row = [
            item.sku,
            item.barcode or "",
            item.name,
            item.description or "",
            item.category_name or "",
            float(item.cost_price),
            float(item.selling_price),
            item.min_stock,
            item.unit,
            expiry_str
        ]
        ws.append(row)
        ws.row_dimensions[row_num].height = 20
        for c_idx in range(1, 11):
            cell = ws.cell(row=row_num, column=c_idx)
            cell.border = thin_border
            if c_idx in [1, 2, 9, 10]:
                cell.alignment = center_align
            elif c_idx in [6, 7]:
                cell.alignment = right_align
                cell.number_format = '$#,##0.00'
            elif c_idx == 8:
                cell.alignment = right_align
                cell.number_format = '#,##0'
            else:
                cell.alignment = left_align
                
    # Auto-fit column widths (iterate by index to avoid MergedCell issues)
    for col_idx in range(1, 11):
        col_letter = get_column_letter(col_idx)
        max_len = 0
        for row_idx in range(1, ws.max_row + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"products_export_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/import/excel")
def import_products_excel(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload an Excel (.xlsx) file."
        )
        
    try:
        wb = load_workbook(filename=io.BytesIO(file.file.read()), data_only=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read Excel file: {str(e)}"
        )
        
    ws = wb.active
    
    # Detect header row
    header_row = None
    for r in range(1, 10):
        row_vals = [str(ws.cell(row=r, column=c).value or '').lower().strip() for c in range(1, 11)]
        if any("sku" in val for val in row_vals if val):
            header_row = r
            break
            
    if not header_row:
        header_row = 4
        
    # Read headers
    headers = [str(ws.cell(row=header_row, column=c).value or '').strip() for c in range(1, 11)]
    col_mapping = {}
    for idx, h in enumerate(headers, 1):
        h_lower = h.lower()
        if "sku" in h_lower:
            col_mapping["sku"] = idx
        elif "barcode" in h_lower:
            col_mapping["barcode"] = idx
        elif "name" in h_lower:
            col_mapping["name"] = idx
        elif "description" in h_lower:
            col_mapping["description"] = idx
        elif "category" in h_lower:
            col_mapping["category"] = idx
        elif "cost" in h_lower:
            col_mapping["cost_price"] = idx
        elif "sell" in h_lower or "selling" in h_lower:
            col_mapping["selling_price"] = idx
        elif "min" in h_lower:
            col_mapping["min_stock"] = idx
        elif "unit" in h_lower:
            col_mapping["unit"] = idx
        elif "expiry" in h_lower or "expire" in h_lower:
            col_mapping["expiry_date"] = idx
            
    required_fields = ["sku", "name", "cost_price", "selling_price"]
    missing = [f for f in required_fields if f not in col_mapping]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not find required columns in the Excel sheet: {', '.join(missing)}"
        )
        
    errors = []
    created_count = 0
    updated_count = 0
    products_to_save = []
    max_row = ws.max_row
    
    for r in range(header_row + 1, max_row + 1):
        row_cells = [ws.cell(row=r, column=c).value for c in range(1, 11)]
        if all(val is None or str(val).strip() == "" for val in row_cells):
            continue
        
        row_errors = []  # Track errors for this row only
            
        sku_val = ws.cell(row=r, column=col_mapping["sku"]).value
        name_val = ws.cell(row=r, column=col_mapping["name"]).value
        cost_val = ws.cell(row=r, column=col_mapping["cost_price"]).value
        sell_val = ws.cell(row=r, column=col_mapping["selling_price"]).value
        
        barcode_val = ws.cell(row=r, column=col_mapping.get("barcode", 11)).value if "barcode" in col_mapping else None
        desc_val = ws.cell(row=r, column=col_mapping.get("description", 11)).value if "description" in col_mapping else None
        cat_val = ws.cell(row=r, column=col_mapping.get("category", 11)).value if "category" in col_mapping else None
        min_stock_val = ws.cell(row=r, column=col_mapping.get("min_stock", 11)).value if "min_stock" in col_mapping else None
        unit_val = ws.cell(row=r, column=col_mapping.get("unit", 11)).value if "unit" in col_mapping else None
        expiry_val = ws.cell(row=r, column=col_mapping.get("expiry_date", 11)).value if "expiry_date" in col_mapping else None
        
        sku_clean = str(sku_val).strip() if sku_val is not None else ""
        name_clean = str(name_val).strip() if name_val is not None else ""
        barcode_clean = str(barcode_val).strip() if barcode_val is not None else None
        desc_clean = str(desc_val).strip() if desc_val is not None else None
        cat_clean = str(cat_val).strip() if cat_val is not None else None
        unit_clean = str(unit_val).strip() if unit_val is not None else "pcs"
        
        if not sku_clean:
            row_errors.append(f"Row {r}: SKU is required")
        if not name_clean:
            row_errors.append(f"Row {r}: Product Name is required")
            
        cost_price = None
        sell_price = None
        
        try:
            cost_price = Decimal(str(cost_val).strip().replace("$", "").replace(",", ""))
            if cost_price < 0:
                row_errors.append(f"Row {r}: Cost price cannot be negative")
        except Exception:
            row_errors.append(f"Row {r}: Cost price must be a valid number")
            
        try:
            sell_price = Decimal(str(sell_val).strip().replace("$", "").replace(",", ""))
            if sell_price < 0:
                row_errors.append(f"Row {r}: Selling price cannot be negative")
        except Exception:
            row_errors.append(f"Row {r}: Selling price must be a valid number")
            
        min_stock = 0
        if min_stock_val is not None and str(min_stock_val).strip() != "":
            try:
                min_stock = int(float(str(min_stock_val).strip()))
                if min_stock < 0:
                    row_errors.append(f"Row {r}: Min Stock Alert cannot be negative")
            except Exception:
                row_errors.append(f"Row {r}: Min Stock Alert must be a valid integer")
                
        parsed_expiry = None
        if expiry_val is not None and str(expiry_val).strip() != "":
            if isinstance(expiry_val, (date, datetime.date, datetime.datetime)):
                parsed_expiry = expiry_val.date() if isinstance(expiry_val, datetime.datetime) else expiry_val
            else:
                expiry_str = str(expiry_val).strip()
                parsed = False
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
                    try:
                        parsed_expiry = datetime.datetime.strptime(expiry_str, fmt).date()
                        parsed = True
                        break
                    except ValueError:
                        continue
                if not parsed:
                    row_errors.append(f"Row {r}: Expiry date '{expiry_str}' is invalid. Use YYYY-MM-DD")
        
        if row_errors:
            errors.extend(row_errors)
        else:
            products_to_save.append({
                "row_num": r,
                "sku": sku_clean,
                "barcode": barcode_clean,
                "name": name_clean,
                "description": desc_clean,
                "category_name": cat_clean,
                "cost_price": cost_price,
                "selling_price": sell_price,
                "min_stock": min_stock,
                "unit": unit_clean,
                "expiry_date": parsed_expiry
            })
            
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Validation failed during import", "errors": errors}
        )
        
    for p_data in products_to_save:
        category_id = None
        if p_data["category_name"]:
            cat = db.query(models.Category).filter(models.Category.name == p_data["category_name"]).first()
            if not cat:
                cat = models.Category(name=p_data["category_name"], description="Created during Excel import")
                db.add(cat)
                db.flush()
            category_id = cat.id
            
        existing_product = db.query(models.Product).filter(models.Product.sku == p_data["sku"]).first()
        if existing_product:
            existing_product.barcode = p_data["barcode"]
            existing_product.name = p_data["name"]
            existing_product.description = p_data["description"]
            existing_product.category_id = category_id
            existing_product.cost_price = p_data["cost_price"]
            existing_product.selling_price = p_data["selling_price"]
            existing_product.min_stock = p_data["min_stock"]
            existing_product.unit = p_data["unit"]
            existing_product.expiry_date = p_data["expiry_date"]
            updated_count += 1
        else:
            new_prod = models.Product(
                sku=p_data["sku"],
                barcode=p_data["barcode"],
                name=p_data["name"],
                description=p_data["description"],
                category_id=category_id,
                cost_price=p_data["cost_price"],
                selling_price=p_data["selling_price"],
                min_stock=p_data["min_stock"],
                unit=p_data["unit"],
                expiry_date=p_data["expiry_date"]
            )
            db.add(new_prod)
            db.flush()
            
            warehouses = db.query(models.Warehouse).all()
            for wh in warehouses:
                db_inv = models.Inventory(product_id=new_prod.id, warehouse_id=wh.id, current_stock=0, reserved_stock=0)
                db.add(db_inv)
            created_count += 1
            
    db.commit()
    
    # Audit log
    log_action(
        db,
        user=current_user,
        action="import",
        resource="products",
        resource_id="excel",
        details=f"Imported products from Excel. Created: {created_count}, Updated: {updated_count}",
        request=request
    )
    
    return {
        "message": "Import completed successfully",
        "created": created_count,
        "updated": updated_count,
        "errors": []
    }
