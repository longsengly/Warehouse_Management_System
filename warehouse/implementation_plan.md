# Implementation Plan - Warehouse Management System (WMS)

This plan outlines the architecture, database schema, API design, frontend modules, and testing strategy for a complete, responsive Warehouse Management System (WMS). It integrates a ReactJS frontend, FastAPI backend, and a MySQL database (via XAMPP).

## User Review Required

> [!IMPORTANT]
> **Database Credentials & Environment:**
> - The database will connect to local MySQL (XAMPP default: `host=localhost`, `user=root`, `password=`, `database=warehouse_db`).
> - The FastAPI backend will run on `http://127.0.0.1:8000` and the React frontend on `http://localhost:5173`.
> - If XAMPP's MySQL is running on a different port or requires a password, it can be customized in the backend `.env` file.

> [!WARNING]
> **Dependencies Installation:**
> - Python 3.14 will use `pymysql` as the database driver, which is cross-platform and does not require complex native builds.
> - Frontend will use custom CSS variables and UI design to achieve a premium, modern responsive layout (supporting dark/light themes) without Tailwind CSS, strictly utilizing Vanilla CSS.

## Open Questions

*No critical open questions at this stage. We have verified MySQL is running on port 3306 and that Node/NPM/Python are installed.*

---

## Proposed Changes

We will create a multi-layer project structure:
1. **Database Schema:** SQL scripts to initialize `warehouse_db` with correct tables, keys, and test data.
2. **Backend (FastAPI):** Python API handles authentication, business logic, transactions, reports, and notification alerts.
3. **Frontend (ReactJS):** Responsive, modern, user-friendly UI containing dashboard charts, management tables, forms, and notification panels.

### Component: Database

#### [NEW] [schema.sql](file:///c:/Users/Admin/Videos/warehouse/schema.sql)
SQL migration script creating the following database tables:
- `users` (id, username, password_hash, role, full_name, email, is_active, created_at)
- `categories` (id, name, description, created_at)
- `suppliers` (id, name, contact_name, phone, email, address, created_at)
- `warehouses` (id, name, location, capacity, created_at)
- `products` (id, sku, barcode, name, description, category_id, cost_price, selling_price, min_stock, unit, image_url, expiry_date, created_at)
- `inventory` (id, product_id, warehouse_id, current_stock, reserved_stock, created_at)
- `inventory_adjustments` (id, product_id, warehouse_id, user_id, type, quantity, reason, created_at)
- `stock_in` (id, transaction_no, supplier_id, receive_date, user_id, total_amount, status, created_at)
- `stock_in_items` (id, stock_in_id, product_id, warehouse_id, batch_number, expiry_date, quantity, cost_price, created_at)
- `stock_out` (id, transaction_no, customer_name, issue_date, user_id, total_amount, status, created_at)
- `stock_out_items` (id, stock_out_id, product_id, warehouse_id, quantity, selling_price, created_at)
- `stock_transfers` (id, transfer_no, source_warehouse_id, destination_warehouse_id, transfer_date, user_id, status, created_at)
- `stock_transfer_items` (id, stock_transfer_id, product_id, quantity, created_at)
- `inventory_movements` (id, product_id, warehouse_id, quantity_changed, type, reference_id, user_id, created_at)
- `notifications` (id, message, type, product_id, is_read, created_at)

---

### Component: Backend (FastAPI)

#### [NEW] [requirements.txt](file:///c:/Users/Admin/Videos/warehouse/backend/requirements.txt)
Python library dependencies:
- `fastapi`, `uvicorn`
- `sqlalchemy`, `pymysql`
- `pydantic`, `pydantic-settings`
- `python-jose[cryptography]`, `passlib[bcrypt]`
- `python-multipart`
- `reportlab`, `openpyxl` (for PDF/Excel report exports)

#### [NEW] [main.py](file:///c:/Users/Admin/Videos/warehouse/backend/app/main.py)
Entry point to initialize the FastAPI app, include routers, configure CORS, and start the API.

#### [NEW] [database.py](file:///c:/Users/Admin/Videos/warehouse/backend/app/database.py) & [models.py](file:///c:/Users/Admin/Videos/warehouse/backend/app/models.py) & [schemas.py](file:///c:/Users/Admin/Videos/warehouse/backend/app/schemas.py)
SQLAlchemy setup, ORM models mapping to the database, and Pydantic validation schemas.

#### [NEW] [auth.py](file:///c:/Users/Admin/Videos/warehouse/backend/app/auth.py)
JWT creation, validation, password hashing, and role-based access control helpers.

#### [NEW] [routers/](file:///c:/Users/Admin/Videos/warehouse/backend/app/routers)
Separate routers for clean modularity:
- `auth.py`: Login, user registration, profiles.
- `products.py`: Product CRUD + image uploads.
- `categories.py`: Category CRUD.
- `suppliers.py`: Supplier CRUD + purchase logs.
- `warehouses.py`: Warehouse CRUD + locations/capacity metrics.
- `inventory.py`: Current stock, inventory adjustments, movement logs.
- `transactions.py`: Handle Stock In, Stock Out, and Stock Transfer business logic (updating inventory and recording movements).
- `reports.py`: Compile report analytics and download PDF/Excel reports.
- `notifications.py`: Manage warning notifications (low stock, expiring, etc.).

#### [NEW] [init_db.py](file:///c:/Users/Admin/Videos/warehouse/backend/init_db.py)
Script to initialize database, create tables, and populate seed data (including default admin/manager/staff users).

---

### Component: Frontend (ReactJS)

The React project will be built with Vite and designed using modern responsive layout practices, rich palettes, cards, glassmorphic headers, and hover animations.

#### [NEW] [package.json](file:///c:/Users/Admin/Videos/warehouse/frontend/package.json)
React setup containing `recharts` for visual data charts and `lucide-react` for iconography.

#### [NEW] [index.css](file:///c:/Users/Admin/Videos/warehouse/frontend/src/index.css)
Global stylesheets establishing a dark/light theme design system: CSS variables for colors, spacing, borders, cards, transitions, and flex/grid responsive helpers.

#### [NEW] [App.jsx](file:///c:/Users/Admin/Videos/warehouse/frontend/src/App.jsx) & [main.jsx](file:///c:/Users/Admin/Videos/warehouse/frontend/src/main.jsx)
Application router matching pathways to responsive page views, secured behind an auth wrapper.

#### [NEW] [components/](file:///c:/Users/Admin/Videos/warehouse/frontend/src/components)
Reusable UI elements:
- `Layout.jsx`: Responsive layout incorporating the navigation sidebar, theme toggle, and notification drawer.
- `Sidebar.jsx`: Collapsible navigation list with user info and roles.
- `Modal.jsx`: Custom backdrop overlays for adding/editing items.
- `NotificationBell.jsx`: Alert count badge triggering a slide-over panel.

#### [NEW] [context/](file:///c:/Users/Admin/Videos/warehouse/frontend/src/context)
- `AuthContext.jsx`: Manages user login state, JWT validation, and current user roles.
- `ThemeContext.jsx`: Toggles dark/light visual states and injects corresponding global CSS variables.

#### [NEW] [pages/](file:///c:/Users/Admin/Videos/warehouse/frontend/src/pages)
- `Login.jsx`: Secure, animated login interface.
- `Dashboard.jsx`: KPI summary widgets (Total Stock, Low Stock, Value) + Recharts interactive graphs + low stock alert panel.
- `Products.jsx`: Grid/Table view of products, barcode scanner mock, CRUD, filters, upload product image.
- `Categories.jsx` & `Suppliers.jsx` & `Warehouses.jsx`: CRUD managers with data filters.
- `Inventory.jsx`: List warehouse stock, adjust stock quantities (with reason inputs), view movement history logs.
- `StockIn.jsx`: Purchase receiving form (select supplier, add items, set batch numbers/expiries).
- `StockOut.jsx`: Dispatch item form with negative stock checks.
- `StockTransfer.jsx`: Move stock between warehouses, validate destination and capacity.
- `Reports.jsx`: Displays metrics lists + print controls + Excel/PDF export buttons.

---

## Verification Plan

### Automated Tests
- Run database initializer `python backend/init_db.py` to assert correct schema generation and initial state setup.
- Execute unit tests for API endpoints:
  - Assert authentication checks and role constraints (e.g. staff blocking admin-only routes).
  - Test business validation rules (assert product creation fails on duplicate SKUs; assert Stock Out fails if stock quantity becomes negative).

### Manual Verification
1. **User Authentication Flow:** Log in as Admin, Manager, and Staff to verify access controls on different navigation items and action buttons.
2. **Stock Adjustments & Movements:** Check that adjusting stock immediately log entries to history and triggers corresponding low stock alerts on the dashboard if below thresholds.
3. **Multi-Warehouse Transfers:** Perform a stock transfer and check that inventory values in both source and destination update correctly.
4. **Reports & Exports:** Run PDF/Excel report downloads and verify layout correctness.
