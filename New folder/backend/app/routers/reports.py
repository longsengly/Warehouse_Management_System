import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/reports", tags=["Reports"])

# Metrics Helper to get dashboard metrics
def get_dashboard_metrics(db: Session):
    total_products = db.query(models.Product).count()
    total_categories = db.query(models.Category).count()
    total_suppliers = db.query(models.Supplier).count()
    total_warehouses = db.query(models.Warehouse).count()
    
    # Total Stock level sum
    total_stock = db.query(func.sum(models.Inventory.current_stock)).scalar() or 0
    
    # Low stock: count products where sum(current_stock) < product.min_stock
    # We fetch all products and count in Python to avoid complex SQL
    products = db.query(models.Product.id, models.Product.min_stock).all()
    low_stock_count = 0
    out_of_stock_count = 0
    for p in products:
        stock_sum = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.product_id == p.id).scalar() or 0
        if stock_sum == 0:
            out_of_stock_count += 1
            low_stock_count += 1
        elif stock_sum < p.min_stock:
            low_stock_count += 1
            
    # Expiring products (expiring within 30 days)
    today = datetime.date.today()
    expiring_soon_count = db.query(models.Product).filter(
        models.Product.expiry_date != None,
        models.Product.expiry_date >= today,
        models.Product.expiry_date <= today + datetime.timedelta(days=30)
    ).count()
    
    # Total inventory value: sum(inventory.current_stock * product.cost_price)
    total_value = db.query(
        func.sum(models.Inventory.current_stock * models.Product.cost_price)
    ).join(models.Product, models.Inventory.product_id == models.Product.id).scalar() or 0
    
    return {
        "total_products": total_products,
        "total_categories": total_categories,
        "total_suppliers": total_suppliers,
        "total_warehouses": total_warehouses,
        "total_stock": int(total_stock),
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "expiring_soon_count": expiring_soon_count,
        "total_inventory_value": round(float(total_value), 2)
    }

@router.get("/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_staff_or_above)):
    metrics = get_dashboard_metrics(db)
    
    # Recent movements (limit to 10)
    movements_query = db.query(
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
     .join(models.User, models.InventoryMovement.user_id == models.User.id)\
     .order_by(models.InventoryMovement.created_at.desc()).limit(10).all()
     
    # Warehouse stock stats
    whs = db.query(models.Warehouse).all()
    warehouse_stats = []
    for w in whs:
        stock = db.query(func.sum(models.Inventory.current_stock)).filter(models.Inventory.warehouse_id == w.id).scalar() or 0
        warehouse_stats.append(schemas.WarehouseStockStats(warehouse_name=w.name, total_stock=int(stock)))
        
    # Category stock stats
    cats = db.query(models.Category).all()
    category_stats = []
    for c in cats:
        stock = db.query(func.sum(models.Inventory.current_stock))\
                  .join(models.Product, models.Inventory.product_id == models.Product.id)\
                  .filter(models.Product.category_id == c.id).scalar() or 0
        category_stats.append(schemas.CategoryStockStats(category_name=c.name, total_stock=int(stock)))
        
    # Movement charts: daily movements for the last 7 days
    movement_chart = []
    today = datetime.date.today()
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        
        # Stock In items received on this day
        in_qty = db.query(func.sum(models.StockInItem.quantity))\
                   .join(models.StockIn, models.StockInItem.stock_in_id == models.StockIn.id)\
                   .filter(func.date(models.StockIn.receive_date) == day).scalar() or 0
                   
        # Stock Out items issued on this day
        out_qty = db.query(func.sum(models.StockOutItem.quantity))\
                    .join(models.StockOut, models.StockOutItem.stock_out_id == models.StockOut.id)\
                    .filter(func.date(models.StockOut.issue_date) == day).scalar() or 0
                    
        movement_chart.append(schemas.DailyMovementStats(
            date=day_str,
            stock_in=int(in_qty),
            stock_out=int(out_qty)
        ))
        
    return schemas.DashboardStats(
        **metrics,
        recent_movements=movements_query,
        warehouse_stats=warehouse_stats,
        category_stats=category_stats,
        movement_chart=movement_chart
    )

@router.get("/export/excel")
def export_excel(
    type: str = Query(..., description="Report type: inventory, stock_in, stock_out, movement"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    wb = Workbook()
    ws = wb.active
    ws.title = type.replace("_", " ").title()
    
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
    ws.merge_cells("A1:G1")
    ws["A1"] = f"Warehouse Management System - {ws.title} Report"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 40
    
    ws["A2"] = f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ws["A2"].font = Font(name="Segoe UI", size=10, italic=True)
    ws.row_dimensions[2].height = 20
    ws.append([]) # Blank row
    
    if type == "inventory":
        headers = ["Product SKU", "Product Name", "Warehouse Name", "Current Stock", "Reserved Stock", "Unit", "Cost Price", "Total Value"]
        ws.append(headers)
        ws.row_dimensions[4].height = 25
        
        # Apply header formatting
        for col_num in range(1, 9):
            cell = ws.cell(row=4, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            
        data = db.query(
            models.Inventory.product_id,
            models.Product.sku,
            models.Product.name.label("product_name"),
            models.Warehouse.name.label("warehouse_name"),
            models.Inventory.current_stock,
            models.Inventory.reserved_stock,
            models.Product.unit,
            models.Product.cost_price
        ).join(models.Product, models.Inventory.product_id == models.Product.id)\
         .join(models.Warehouse, models.Inventory.warehouse_id == models.Warehouse.id).all()
         
        for row_num, item in enumerate(data, 5):
            val_total = item.current_stock * item.cost_price
            row = [
                item.sku, 
                item.product_name, 
                item.warehouse_name, 
                item.current_stock, 
                item.reserved_stock, 
                item.unit, 
                float(item.cost_price), 
                float(val_total)
            ]
            ws.append(row)
            ws.row_dimensions[row_num].height = 20
            
            # Format row cells
            for c_idx in range(1, 9):
                cell = ws.cell(row=row_num, column=c_idx)
                cell.border = thin_border
                if c_idx in [1, 3, 6]:
                    cell.alignment = center_align
                elif c_idx in [4, 5]:
                    cell.alignment = right_align
                    cell.number_format = '#,##0'
                elif c_idx in [7, 8]:
                    cell.alignment = right_align
                    cell.number_format = '$#,##0.00'
                else:
                    cell.alignment = left_align
                    
    elif type == "stock_in":
        headers = ["TX No", "Receive Date", "Supplier Name", "Received By", "Total Amount", "Status"]
        ws.append(headers)
        ws.row_dimensions[4].height = 25
        
        for col_num in range(1, 7):
            cell = ws.cell(row=4, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            
        data = db.query(
            models.StockIn.transaction_no,
            models.StockIn.receive_date,
            models.Supplier.name.label("supplier_name"),
            models.User.username.label("username"),
            models.StockIn.total_amount,
            models.StockIn.status
        ).join(models.Supplier, models.StockIn.supplier_id == models.Supplier.id)\
         .join(models.User, models.StockIn.user_id == models.User.id).all()
         
        for row_num, item in enumerate(data, 5):
            row = [
                item.transaction_no,
                item.receive_date.strftime("%Y-%m-%d %H:%M"),
                item.supplier_name,
                item.username,
                float(item.total_amount),
                item.status.upper()
            ]
            ws.append(row)
            ws.row_dimensions[row_num].height = 20
            for c_idx in range(1, 7):
                cell = ws.cell(row=row_num, column=c_idx)
                cell.border = thin_border
                if c_idx in [1, 2, 4, 6]:
                    cell.alignment = center_align
                elif c_idx == 5:
                    cell.alignment = right_align
                    cell.number_format = '$#,##0.00'
                else:
                    cell.alignment = left_align
                    
    elif type == "stock_out":
        headers = ["TX No", "Issue Date", "Customer / Dept", "Issued By", "Total Value", "Status"]
        ws.append(headers)
        ws.row_dimensions[4].height = 25
        
        for col_num in range(1, 7):
            cell = ws.cell(row=4, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            
        data = db.query(
            models.StockOut.transaction_no,
            models.StockOut.issue_date,
            models.StockOut.customer_name,
            models.User.username.label("username"),
            models.StockOut.total_amount,
            models.StockOut.status
        ).join(models.User, models.StockOut.user_id == models.User.id).all()
         
        for row_num, item in enumerate(data, 5):
            row = [
                item.transaction_no,
                item.issue_date.strftime("%Y-%m-%d %H:%M"),
                item.customer_name,
                item.username,
                float(item.total_amount),
                item.status.upper()
            ]
            ws.append(row)
            ws.row_dimensions[row_num].height = 20
            for c_idx in range(1, 7):
                cell = ws.cell(row=row_num, column=c_idx)
                cell.border = thin_border
                if c_idx in [1, 2, 4, 6]:
                    cell.alignment = center_align
                elif c_idx == 5:
                    cell.alignment = right_align
                    cell.number_format = '$#,##0.00'
                else:
                    cell.alignment = left_align
                    
    elif type == "movement":
        headers = ["Date & Time", "Product SKU", "Product Name", "Warehouse", "Qty Changed", "Type", "Recorded By"]
        ws.append(headers)
        ws.row_dimensions[4].height = 25
        
        for col_num in range(1, 8):
            cell = ws.cell(row=4, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            
        data = db.query(
            models.InventoryMovement.created_at,
            models.Product.sku,
            models.Product.name.label("product_name"),
            models.Warehouse.name.label("warehouse_name"),
            models.InventoryMovement.quantity_changed,
            models.InventoryMovement.type,
            models.User.username.label("username")
        ).join(models.Product, models.InventoryMovement.product_id == models.Product.id)\
         .join(models.Warehouse, models.InventoryMovement.warehouse_id == models.Warehouse.id)\
         .join(models.User, models.InventoryMovement.user_id == models.User.id).all()
         
        for row_num, item in enumerate(data, 5):
            row = [
                item.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                item.sku,
                item.product_name,
                item.warehouse_name,
                item.quantity_changed,
                item.type.upper(),
                item.username
            ]
            ws.append(row)
            ws.row_dimensions[row_num].height = 20
            for c_idx in range(1, 8):
                cell = ws.cell(row=row_num, column=c_idx)
                cell.border = thin_border
                if c_idx in [1, 2, 4, 6, 7]:
                    cell.alignment = center_align
                elif c_idx == 5:
                    cell.alignment = right_align
                    cell.number_format = '#,##0'
                else:
                    cell.alignment = left_align
                    
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report type")
        
    # Auto-fit column widths
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"{type}_report_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_pdf(
    type: str = Query(..., description="Report type: inventory, stock_in, stock_out, movement"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    output = io.BytesIO()
    # SimpleDocTemplate setup (use landscape for width flexibility)
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(letter),
        rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=22,
        textColor=colors.HexColor('#1F497D'),
        spaceAfter=6
    )
    
    meta_style = ParagraphStyle(
        'ReportMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=12,
        textColor=colors.gray,
        spaceAfter=20
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11
    )
    
    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    
    elements = []
    
    # Add Title and Metadata
    report_title = f"WMS - {type.replace('_', ' ').title()} Report"
    elements.append(Paragraph(report_title, title_style))
    elements.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Generated by: {current_user.full_name}", meta_style))
    
    # Populate data tables
    table_data = []
    
    if type == "inventory":
        headers = [Paragraph(h, header_style) for h in ["SKU", "Product Name", "Warehouse", "Stock", "Reserved", "Unit", "Cost Price", "Total Value"]]
        table_data.append(headers)
        
        data = db.query(
            models.Product.sku,
            models.Product.name.label("product_name"),
            models.Warehouse.name.label("warehouse_name"),
            models.Inventory.current_stock,
            models.Inventory.reserved_stock,
            models.Product.unit,
            models.Product.cost_price
        ).join(models.Product, models.Inventory.product_id == models.Product.id)\
         .join(models.Warehouse, models.Inventory.warehouse_id == models.Warehouse.id).all()
         
        for item in data:
            val_total = item.current_stock * item.cost_price
            table_data.append([
                Paragraph(item.sku, cell_style),
                Paragraph(item.product_name, cell_style),
                Paragraph(item.warehouse_name, cell_style),
                Paragraph(str(item.current_stock), cell_style),
                Paragraph(str(item.reserved_stock), cell_style),
                Paragraph(item.unit, cell_style),
                Paragraph(f"${item.cost_price:.2f}", cell_style),
                Paragraph(f"${val_total:.2f}", cell_style)
            ])
        col_widths = [80, 180, 100, 50, 50, 45, 65, 80]
        
    elif type == "stock_in":
        headers = [Paragraph(h, header_style) for h in ["Transaction No", "Receive Date", "Supplier", "Received By", "Total Amount", "Status"]]
        table_data.append(headers)
        
        data = db.query(
            models.StockIn.transaction_no,
            models.StockIn.receive_date,
            models.Supplier.name.label("supplier_name"),
            models.User.username.label("username"),
            models.StockIn.total_amount,
            models.StockIn.status
        ).join(models.Supplier, models.StockIn.supplier_id == models.Supplier.id)\
         .join(models.User, models.StockIn.user_id == models.User.id).all()
         
        for item in data:
            table_data.append([
                Paragraph(item.transaction_no, cell_style),
                Paragraph(item.receive_date.strftime("%Y-%m-%d %H:%M"), cell_style),
                Paragraph(item.supplier_name, cell_style),
                Paragraph(item.username, cell_style),
                Paragraph(f"${item.total_amount:.2f}", cell_style),
                Paragraph(item.status.upper(), cell_style)
            ])
        col_widths = [130, 100, 170, 80, 85, 75]
        
    elif type == "stock_out":
        headers = [Paragraph(h, header_style) for h in ["Transaction No", "Issue Date", "Customer / Department", "Issued By", "Total Value", "Status"]]
        table_data.append(headers)
        
        data = db.query(
            models.StockOut.transaction_no,
            models.StockOut.issue_date,
            models.StockOut.customer_name,
            models.User.username.label("username"),
            models.StockOut.total_amount,
            models.StockOut.status
        ).join(models.User, models.StockOut.user_id == models.User.id).all()
         
        for item in data:
            table_data.append([
                Paragraph(item.transaction_no, cell_style),
                Paragraph(item.issue_date.strftime("%Y-%m-%d %H:%M"), cell_style),
                Paragraph(item.customer_name, cell_style),
                Paragraph(item.username, cell_style),
                Paragraph(f"${item.total_amount:.2f}", cell_style),
                Paragraph(item.status.upper(), cell_style)
            ])
        col_widths = [130, 100, 170, 80, 85, 75]
        
    elif type == "movement":
        headers = [Paragraph(h, header_style) for h in ["Date & Time", "SKU", "Product Name", "Warehouse", "Qty Change", "Type", "Recorded By"]]
        table_data.append(headers)
        
        data = db.query(
            models.InventoryMovement.created_at,
            models.Product.sku,
            models.Product.name.label("product_name"),
            models.Warehouse.name.label("warehouse_name"),
            models.InventoryMovement.quantity_changed,
            models.InventoryMovement.type,
            models.User.username.label("username")
        ).join(models.Product, models.InventoryMovement.product_id == models.Product.id)\
         .join(models.Warehouse, models.InventoryMovement.warehouse_id == models.Warehouse.id)\
         .join(models.User, models.InventoryMovement.user_id == models.User.id).all()
         
        for item in data:
            table_data.append([
                Paragraph(item.created_at.strftime("%Y-%m-%d %H:%M:%S"), cell_style),
                Paragraph(item.sku, cell_style),
                Paragraph(item.product_name, cell_style),
                Paragraph(item.warehouse_name, cell_style),
                Paragraph(f"{item.quantity_changed:+d}" if item.quantity_changed != 0 else "0", cell_style),
                Paragraph(item.type.upper(), cell_style),
                Paragraph(item.username, cell_style)
            ])
        col_widths = [110, 80, 170, 95, 60, 75, 70]
        
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report type")
        
    # Table visual formatting
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F497D')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    output.seek(0)
    filename = f"{type}_report_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
