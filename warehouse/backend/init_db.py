import datetime
from app.database import SessionLocal, engine
from app import models, auth

def seed_db():
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(models.User).count() > 0:
            print("Database already contains data. Seeding skipped.")
            return

        print("Seeding database...")

        # 1. Users
        users = [
            models.User(
                username="admin",
                password_hash=auth.get_password_hash("admin123"),
                role="admin",
                full_name="System Administrator",
                email="admin@wms.com"
            ),
            models.User(
                username="manager",
                password_hash=auth.get_password_hash("manager123"),
                role="manager",
                full_name="Warehouse Manager",
                email="manager@wms.com"
            ),
            models.User(
                username="staff",
                password_hash=auth.get_password_hash("staff123"),
                role="staff",
                full_name="Inventory Staff",
                email="staff@wms.com"
            ),
        ]
        db.add_all(users)
        db.commit()

        # 2. Categories
        categories = [
            models.Category(name="Electronics", description="Phones, laptops, and consumer devices"),
            models.Category(name="Food & Beverages", description="Packaged food, juices, and drinks"),
            models.Category(name="Apparel", description="Clothing, shoes, and fabrics"),
        ]
        db.add_all(categories)
        db.commit()

        # 3. Warehouses
        warehouses = [
            models.Warehouse(name="Main Warehouse (A)", location="Building A, Industrial Zone", capacity=5000),
            models.Warehouse(name="West Coast Depot (B)", location="Port Sector B, California", capacity=3000),
        ]
        db.add_all(warehouses)
        db.commit()

        # 4. Suppliers
        suppliers = [
            models.Supplier(name="Apex Tech Distributors", contact_name="John Doe", phone="123-456-7890", email="john@apextech.com", address="Silicon Street, NY"),
            models.Supplier(name="Global Foods Ltd", contact_name="Jane Smith", phone="987-654-3210", email="jane@globalfoods.com", address="Organic Lane, CA"),
            models.Supplier(name="Prime Garments", contact_name="Alan Walker", phone="555-123-4567", email="alan@primegarments.com", address="Cotton Way, TX"),
        ]
        db.add_all(suppliers)
        db.commit()

        # 5. Products
        today = datetime.date.today()
        products = [
            models.Product(
                sku="ELE-IPH15",
                barcode="190198066348",
                name="iPhone 15 Pro Max 256GB",
                description="Apple flagship smartphone (Titanium Blue)",
                category_id=categories[0].id,
                cost_price=850.00,
                selling_price=1199.00,
                min_stock=5,
                unit="pcs",
                image_url=""
            ),
            models.Product(
                sku="FOD-ORNGJ",
                barcode="8801056037084",
                name="Organic Orange Juice 1L",
                description="100% freshly squeezed juice - no added sugars",
                category_id=categories[1].id,
                cost_price=1.80,
                selling_price=3.50,
                min_stock=50,
                unit="bottle",
                expiry_date=today + datetime.timedelta(days=120)
            ),
            models.Product(
                sku="APP-TSHRT",
                barcode="4006381333931",
                name="Casual Crewneck T-Shirt (M)",
                description="100% organic cotton breathable black T-Shirt",
                category_id=categories[2].id,
                cost_price=8.00,
                selling_price=19.99,
                min_stock=30,
                unit="pcs",
                image_url=""
            ),
        ]
        db.add_all(products)
        db.commit()

        # 6. Initialize Inventory stocks (current stock = 0)
        for prod in products:
            for wh in warehouses:
                db_inventory = models.Inventory(
                    product_id=prod.id,
                    warehouse_id=wh.id,
                    current_stock=0,
                    reserved_stock=0
                )
                db.add(db_inventory)
        db.commit()

        # 7. Add some initial stock received (Stock In transactions for demo purposes)
        # We simulate receiving stock in Warehouse A
        tx_no = "TX-IN-INIT-001"
        db_stock_in = models.StockIn(
            transaction_no=tx_no,
            supplier_id=suppliers[0].id,
            receive_date=datetime.datetime.now() - datetime.timedelta(days=2),
            user_id=users[0].id,
            total_amount=8500.00, # 10 iPhones * 850
            status="completed"
        )
        db.add(db_stock_in)
        db.commit()

        # Stock In Item
        db_stock_in_item = models.StockInItem(
            stock_in_id=db_stock_in.id,
            product_id=products[0].id,
            warehouse_id=warehouses[0].id,
            batch_number="BCH-IPH-01",
            expiry_date=None,
            quantity=10,
            cost_price=850.00
        )
        db.add(db_stock_in_item)
        db.commit()

        # Update Inventory stock levels
        inv1 = db.query(models.Inventory).filter(
            models.Inventory.product_id == products[0].id,
            models.Inventory.warehouse_id == warehouses[0].id
        ).first()
        inv1.current_stock = 10
        db.commit()

        # Log Movement
        db_mov = models.InventoryMovement(
            product_id=products[0].id,
            warehouse_id=warehouses[0].id,
            quantity_changed=10,
            type="stock_in",
            reference_id=db_stock_in_item.id,
            user_id=users[0].id
        )
        db.add(db_mov)
        db.commit()

        # Seed Stock In for Juice
        tx_no_2 = "TX-IN-INIT-002"
        db_stock_in_2 = models.StockIn(
            transaction_no=tx_no_2,
            supplier_id=suppliers[1].id,
            receive_date=datetime.datetime.now() - datetime.timedelta(days=1),
            user_id=users[0].id,
            total_amount=144.00, # 80 juices * 1.80
            status="completed"
        )
        db.add(db_stock_in_2)
        db.commit()

        db_stock_in_item_2 = models.StockInItem(
            stock_in_id=db_stock_in_2.id,
            product_id=products[1].id,
            warehouse_id=warehouses[0].id,
            batch_number="BCH-ORJ-99",
            expiry_date=today + datetime.timedelta(days=120),
            quantity=80,
            cost_price=1.80
        )
        db.add(db_stock_in_item_2)
        db.commit()

        inv2 = db.query(models.Inventory).filter(
            models.Inventory.product_id == products[1].id,
            models.Inventory.warehouse_id == warehouses[0].id
        ).first()
        inv2.current_stock = 80
        db.commit()

        db_mov_2 = models.InventoryMovement(
            product_id=products[1].id,
            warehouse_id=warehouses[0].id,
            quantity_changed=80,
            type="stock_in",
            reference_id=db_stock_in_item_2.id,
            user_id=users[0].id
        )
        db.add(db_mov_2)
        db.commit()

        print("Seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
