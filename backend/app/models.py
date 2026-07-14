from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("admin", "manager", "staff", name="user_roles"), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    products = relationship("Product", back_populates="category")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    contact_name = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    stock_ins = relationship("StockIn", back_populates="supplier")

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    location = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    inventory = relationship("Inventory", back_populates="warehouse")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(100))
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    cost_price = Column(Numeric(10, 2), nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    min_stock = Column(Integer, default=0)
    unit = Column(String(20), default="pcs")
    image_url = Column(String(255))
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("Category", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    current_stock = Column(Integer, default=0)
    reserved_stock = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product", back_populates="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")

class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    type = Column(Enum("increase", "decrease", name="adjustment_types"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product")
    warehouse = relationship("Warehouse")
    user = relationship("User")

class StockIn(Base):
    __tablename__ = "stock_in"

    id = Column(Integer, primary_key=True, index=True)
    transaction_no = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    receive_date = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum("completed", "pending", "cancelled", name="transaction_statuses"), default="completed")
    created_at = Column(DateTime, server_default=func.now())

    supplier = relationship("Supplier", back_populates="stock_ins")
    user = relationship("User")
    items = relationship("StockInItem", back_populates="stock_in", cascade="all, delete-orphan")

class StockInItem(Base):
    __tablename__ = "stock_in_items"

    id = Column(Integer, primary_key=True, index=True)
    stock_in_id = Column(Integer, ForeignKey("stock_in.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    batch_number = Column(String(50))
    expiry_date = Column(Date, nullable=True)
    quantity = Column(Integer, nullable=False)
    cost_price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    stock_in = relationship("StockIn", back_populates="items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")

class StockOut(Base):
    __tablename__ = "stock_out"

    id = Column(Integer, primary_key=True, index=True)
    transaction_no = Column(String(50), unique=True, nullable=False, index=True)
    customer_name = Column(String(150), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum("completed", "pending", "cancelled", name="transaction_statuses"), default="completed")
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    items = relationship("StockOutItem", back_populates="stock_out", cascade="all, delete-orphan")

class StockOutItem(Base):
    __tablename__ = "stock_out_items"

    id = Column(Integer, primary_key=True, index=True)
    stock_out_id = Column(Integer, ForeignKey("stock_out.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    stock_out = relationship("StockOut", back_populates="items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")

class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_no = Column(String(50), unique=True, nullable=False, index=True)
    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False)
    transfer_date = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(Enum("completed", "pending", "cancelled", name="transaction_statuses"), default="completed")
    created_at = Column(DateTime, server_default=func.now())

    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id])
    user = relationship("User")
    items = relationship("StockTransferItem", back_populates="stock_transfer", cascade="all, delete-orphan")

class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    stock_transfer_id = Column(Integer, ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    stock_transfer = relationship("StockTransfer", back_populates="items")
    product = relationship("Product")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    type = Column(Enum("stock_in", "stock_out", "transfer_out", 'transfer_in', "adjustment", name="movement_types"), nullable=False)
    reference_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product")
    warehouse = relationship("Warehouse")
    user = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(255), nullable=False)
    type = Column(Enum("low_stock", "out_of_stock", "expiring_soon", "info", name="notification_types"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product")
