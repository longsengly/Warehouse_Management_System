from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Warehouse Schemas
class WarehouseBase(BaseModel):
    name: str
    location: str
    capacity: int

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseOut(WarehouseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    sku: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Decimal
    selling_price: Decimal
    min_stock: int = 0
    unit: str = "pcs"
    image_url: Optional[str] = None
    expiry_date: Optional[date] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    min_stock: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    expiry_date: Optional[date] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    category_name: Optional[str] = None

    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    unit: str
    warehouse_id: int
    warehouse_name: str
    current_stock: int
    reserved_stock: int
    min_stock: int
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryAdjustmentCreate(BaseModel):
    product_id: int
    warehouse_id: int
    type: str  # "increase" or "decrease"
    quantity: int
    reason: str

class InventoryAdjustmentOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    warehouse_id: int
    warehouse_name: str
    user_id: int
    username: str
    type: str
    quantity: int
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# Stock In Schemas
class StockInItemCreate(BaseModel):
    product_id: int
    warehouse_id: int
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: int
    cost_price: Decimal

class StockInItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    warehouse_id: int
    warehouse_name: str
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: int
    cost_price: Decimal

    class Config:
        from_attributes = True

class StockInCreate(BaseModel):
    supplier_id: int
    receive_date: datetime
    items: List[StockInItemCreate]

class StockInOut(BaseModel):
    id: int
    transaction_no: str
    supplier_id: int
    supplier_name: str
    receive_date: datetime
    user_id: int
    username: str
    total_amount: Decimal
    status: str
    items: List[StockInItemOut]
    created_at: datetime

    class Config:
        from_attributes = True

# Stock Out Schemas
class StockOutItemCreate(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int
    selling_price: Decimal

class StockOutItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    warehouse_id: int
    warehouse_name: str
    quantity: int
    selling_price: Decimal

    class Config:
        from_attributes = True

class StockOutCreate(BaseModel):
    customer_name: str
    issue_date: datetime
    items: List[StockOutItemCreate]

class StockOutOut(BaseModel):
    id: int
    transaction_no: str
    customer_name: str
    issue_date: datetime
    user_id: int
    username: str
    total_amount: Decimal
    status: str
    items: List[StockOutItemOut]
    created_at: datetime

    class Config:
        from_attributes = True

# Stock Transfer Schemas
class StockTransferItemCreate(BaseModel):
    product_id: int
    quantity: int

class StockTransferItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    quantity: int

    class Config:
        from_attributes = True

class StockTransferCreate(BaseModel):
    source_warehouse_id: int
    destination_warehouse_id: int
    transfer_date: datetime
    items: List[StockTransferItemCreate]

class StockTransferOut(BaseModel):
    id: int
    transfer_no: str
    source_warehouse_id: int
    source_warehouse_name: str
    destination_warehouse_id: int
    destination_warehouse_name: str
    transfer_date: datetime
    user_id: int
    username: str
    status: str
    items: List[StockTransferItemOut]
    created_at: datetime

    class Config:
        from_attributes = True

# Inventory Movement Schemas
class InventoryMovementOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    warehouse_id: int
    warehouse_name: str
    quantity_changed: int
    type: str
    reference_id: int
    user_id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationOut(BaseModel):
    id: int
    message: str
    type: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: bool

# Dashboard Statistics Schemas
class WarehouseStockStats(BaseModel):
    warehouse_name: str
    total_stock: int

class CategoryStockStats(BaseModel):
    category_name: str
    total_stock: int

class DailyMovementStats(BaseModel):
    date: str
    stock_in: int
    stock_out: int

class DashboardStats(BaseModel):
    total_products: int
    total_categories: int
    total_suppliers: int
    total_warehouses: int
    total_stock: int
    low_stock_count: int
    out_of_stock_count: int
    expiring_soon_count: int
    total_inventory_value: Decimal
    recent_movements: List[InventoryMovementOut]
    warehouse_stats: List[WarehouseStockStats]
    category_stats: List[CategoryStockStats]
    movement_chart: List[DailyMovementStats]
