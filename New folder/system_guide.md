# WMS CORE — Complete System Guide
*Every file, every feature, how it all connects*

---

## 🗺️ How the System Works (Big Picture)

```
Browser (React)  ──HTTP requests──▶  FastAPI Backend  ──SQLAlchemy──▶  MySQL Database
     ↑                                     │
     └──────── JSON responses ─────────────┘
```

When you open the app in your browser:
1. React loads and checks for a saved login token.
2. If logged in, each page makes API calls to the backend at `http://localhost:8000/api/...`.
3. FastAPI receives those requests, queries MySQL via SQLAlchemy models, and returns JSON.
4. React renders the data into the tables, charts, and forms you see.

---

## 📁 BACKEND FILES (`/backend/`)

### `init_db.py` — Database Seeder
**What it does**: Seeds the database with sample data when you first set up the project.
Creates 3 users (admin, manager, staff), 3 categories, 2 warehouses, 2 suppliers, 10 products, and initial stock transactions.
**When to run**: Once only, at first setup: `python init_db.py`

---

### `requirements.txt` — Python Dependencies
Lists all Python packages needed. Install with `pip install -r requirements.txt`.

Key packages:
- `fastapi` — the web framework
- `uvicorn` — the web server
- `sqlalchemy` — database ORM
- `pymysql` — MySQL driver
- `bcrypt` — password hashing
- `python-jose` — JWT token generation
- `openpyxl` — Excel export
- `reportlab` — PDF export

---

### `/app/config.py` — App Configuration
Holds global settings read from environment variables or `.env` file.
- `DATABASE_URL` → MySQL connection string (`root@localhost/warehouse_db`)
- `SECRET_KEY` → used to sign JWT tokens
- `ACCESS_TOKEN_EXPIRE_MINUTES` → login sessions last 360 minutes (6 hours)
- `UPLOAD_DIR` → where product images are saved on disk

---

### `/app/database.py` — Database Connection
Creates the SQLAlchemy engine and session factory.
- `engine` → raw connection to MySQL
- `SessionLocal` → factory that creates a new DB session per request
- `get_db()` → dependency injected into every API route for DB access

---

### `/app/models.py` — Database Table Definitions
Defines every MySQL table as a Python class. Each class = one table.

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Stores login credentials, roles, names |
| `Category` | `categories` | Product groupings (Electronics, Food, etc.) |
| `Supplier` | `suppliers` | Vendor details (name, phone, email, address) |
| `Warehouse` | `warehouses` | Physical locations with max capacity |
| `Product` | `products` | SKU, pricing, min stock, expiry dates |
| `Inventory` | `inventory` | Current stock per product per warehouse |
| `StockIn` | `stock_ins` | Purchase/receiving transaction header |
| `StockInItem` | `stock_in_items` | Line items for each Stock In |
| `StockOut` | `stock_outs` | Sales/dispatch transaction header |
| `StockOutItem` | `stock_out_items` | Line items for each Stock Out |
| `StockTransfer` | `stock_transfers` | Transfer between warehouse header |
| `StockTransferItem` | `stock_transfer_items` | Line items for each Transfer |
| `InventoryAdjustment` | `inventory_adjustments` | Manual stock correction records |
| `InventoryMovement` | `inventory_movements` | Complete audit trail of every stock change |
| `Notification` | `notifications` | Low stock / out of stock / expiry alerts |
| `AuditLog` | `audit_logs` | Who did what, when, from which IP |

---

### `/app/schemas.py` — Request & Response Validators
Pydantic models that define the exact shape of data coming in and going out of every API endpoint.
- `ProductCreate` → what fields are required to create a product
- `StockInOut` → what the API returns when you fetch a Stock In record
- `NotificationOut` → structure of each notification object
- Prevents invalid or missing data from ever reaching the database.

---

### `/app/auth.py` — Authentication Logic
- `get_password_hash(password)` → bcrypt-hashes a plain password before saving
- `verify_password(plain, hashed)` → checks a login attempt
- `create_access_token(data)` → generates a JWT token (expires in 6h)
- `get_current_user()` → dependency that reads the JWT token on every protected request
- `require_staff_or_above` → gate that blocks unauthenticated users
- `require_manager_or_admin` → gate for manager-level actions
- `require_admin` → gate for admin-only operations

---

### `/app/audit_helper.py` — Audit Log Writer
A helper function `log_action()` called throughout the codebase whenever someone performs a significant action (create product, delete user, adjust stock).

Records:
- Which **user** did it
- The **action type** (create, update, delete, adjust, transfer)
- The **resource** affected (products, inventory, users, etc.)
- The **resource ID**
- A **plain-text description**
- The **IP address** and **browser** used

---

### `/app/inventory_helper.py` — Legacy Helper File
An older backup copy of the inventory router. **Not used** by the running server (it is not imported anywhere in `main.py`). Safe to ignore.

---

### `/app/main.py` — Application Entry Point
The FastAPI app initialization file.
- Creates the FastAPI app object
- Adds CORS middleware (allows the React frontend on port 5173 to make requests)
- Mounts `/static` for serving uploaded product images
- Registers all routers under the `/api` prefix:
  - `/api/auth`, `/api/products`, `/api/categories`, `/api/suppliers`
  - `/api/warehouses`, `/api/inventory`, `/api/transactions`
  - `/api/reports`, `/api/notifications`, `/api/users`, `/api/audit-logs`

---

### `/app/routers/` — API Route Files

#### `auth.py`
- `POST /api/auth/login` → accepts username+password, returns JWT token
- `GET /api/auth/me` → returns the currently logged-in user's profile

#### `products.py`
- `GET /api/products` → list all products (filterable by name, SKU, category, low-stock flag)
- `POST /api/products` → create a new product (manager+ only)
- `PUT /api/products/{id}` → update product details
- `DELETE /api/products/{id}` → soft-delete a product
- `POST /api/products/{id}/upload-image` → upload a product photo
- `GET /api/products/export/excel` → download product list as Excel
- `POST /api/products/import/excel` → bulk import products from an Excel template

#### `categories.py`
- Full CRUD: list, create, update, delete categories
- `GET /api/categories/export/excel` → export categories to Excel
- `POST /api/categories/import/excel` → bulk import from Excel

#### `suppliers.py`
- Full CRUD: list, create, update, delete suppliers

#### `warehouses.py`
- Full CRUD: list, create, update, delete warehouses
- Auto-creates `Inventory` rows for every existing product when a new warehouse is added

#### `inventory.py`
- `GET /api/inventory` → list all stock levels per product per warehouse
- `POST /api/inventory/adjust` → manually adjust stock (manager+ only)
- `check_and_trigger_notifications(product_id, db)` → checks a single product's stock and creates alerts if needed
- `check_and_trigger_all_notifications(db)` → bulk scans all products and creates missing alerts

#### `transactions.py`
- `POST /api/transactions/stock-in` → receive new goods from supplier
- `POST /api/transactions/stock-out` → dispatch goods to a customer
- `POST /api/transactions/transfer` → move stock between warehouses
- `GET /api/transactions/stock-ins` → list all stock-in records
- `GET /api/transactions/stock-outs` → list all stock-out records
- `GET /api/transactions/transfers` → list all transfer records
- Each transaction automatically calls `check_and_trigger_notifications` after updating stock

#### `notifications.py`
- `GET /api/notifications` → list notifications (filtered by `?unread_only=true`)
  - **Also runs `check_and_trigger_all_notifications` on every call** to keep alerts fresh
- `PUT /api/notifications/mark-all-read` → mark all alerts as read
- `PUT /api/notifications/{id}` → mark a single notification as read

#### `reports.py`
- `GET /api/reports/dashboard-stats` → KPI numbers, recent movements, warehouse/category charts
- `GET /api/reports/export/excel?type=inventory|stock_in|stock_out` → Excel export
- `GET /api/reports/export/pdf?type=inventory|stock_in|stock_out` → PDF export

#### `users.py` (admin only)
- `GET /api/users` → list all system users
- `POST /api/users` → create a new user
- `PUT /api/users/{id}` → update user details / reset password
- `DELETE /api/users/{id}` → deactivate a user

#### `audit_logs.py` (manager+ only)
- `GET /api/audit-logs` → paginated audit log with filters for user, action, resource, date range

---

## 📁 FRONTEND FILES (`/frontend/src/`)

### `main.jsx` — React App Bootstrap
The very first file React loads. It mounts the `<App />` component into the HTML page.

### `App.jsx` — Router & Route Guards
Defines every URL route in the application and protects them:
- `/login` → public, redirects to dashboard if already logged in
- `/dashboard`, `/products`, etc. → protected, redirects to login if not authenticated
- `/users` → **admin only**
- `/audit-logs` → **admin and manager only**
- `LayoutWrapper` maps URL paths to human-friendly page titles shown in the navbar

### `index.css` — Global Design System
The entire visual design lives here. Defines CSS variables for:
- Colors (primary, danger, warning, success, info)
- Light and dark theme tokens
- Typography (uses Google Inter font)
- Reusable component styles: `.card`, `.btn`, `.badge`, `.table`, `.modal-overlay`
- Sidebar, header, notification drawer animations

### `App.css` — Minor App-Level Overrides
Small additional CSS rules on top of `index.css`.

---

### `/context/` — Global State Providers

#### `AuthContext.jsx`
The authentication brain of the app.
- Stores the JWT `token` and `user` profile in both React state and `localStorage`
- On startup, verifies the saved token is still valid with `/api/auth/me`
- Provides `login()`, `logout()`, `hasRole()` functions to every page
- Listens for 401 errors from the API and auto-logs out if the token has expired
- Exposes `isAdmin`, `isManager`, `isStaff` booleans for easy permission checks

#### `ThemeContext.jsx`
Manages light/dark mode toggle.
- Saves the user's preference to `localStorage`
- Applies a `data-theme="dark"` attribute to `<html>` to switch CSS variable sets

---

### `/services/api.js` — HTTP Client
A thin wrapper around the browser's `fetch()` API.
- Automatically attaches the `Authorization: Bearer <token>` header to every request
- Handles JSON parsing, error extraction, and 401 auto-logout globally
- Provides: `api.get()`, `api.post()`, `api.put()`, `api.delete()`, `api.upload()`, `api.login()`

---

### `/components/` — Reusable Layout Components

#### `Layout.jsx`
The outer shell that wraps every authenticated page. Renders the Sidebar on the left, the Navbar on top, and the current page content in the main area.

#### `Navbar.jsx`
The top bar showing:
- Current page title
- Light/dark mode toggle button
- Notification bell with a live unread count badge (polls every 30 seconds)
- Opens the `NotificationDrawer` when clicked

#### `NotificationDrawer.jsx`
The slide-in panel from the right that shows all unread stock alerts:
- Fetches `/api/notifications?unread_only=true` every time it opens
- Shows icons/badges for `out_of_stock`, `low_stock`, and `expiring_soon` types
- "Mark as read" button per item or "Mark all read" button
- Updates the bell count in real time after marking

#### `Sidebar.jsx`
The left navigation menu:
- Shows only pages the logged-in user's role can access
- Highlights the active page
- Shows the user's avatar (initial letter), full name, role badge, and Sign Out button

#### `ErrorBoundary.jsx`
A React error boundary that catches JavaScript errors inside page components to prevent the whole app from crashing.

---

### `/pages/` — Application Pages

#### `Login.jsx`
Login form. Submits credentials to `/api/auth/login`, saves the token, then redirects to Dashboard.

#### `Dashboard.jsx`
The home page. Shows:
- 9 KPI stat cards (products, categories, suppliers, warehouses, total stock, low stock, out of stock, expiring soon, total value)
- Line chart: stock movements over time
- Bar chart: warehouse stock levels
- Pie chart: stock distribution by category
- Table: 10 most recent inventory movements

#### `Products.jsx`
Product catalog management:
- Search/filter by name, SKU, or category
- Add, edit, delete products
- Upload product photo
- Import products from Excel template
- Export product list to Excel

#### `Categories.jsx`
Category management (Electronics, Food, etc.):
- Add, edit, delete categories
- Import/export via Excel

#### `Suppliers.jsx`
Supplier directory:
- Add, edit, delete suppliers with full contact info (name, phone, email, address)

#### `Warehouses.jsx`
Warehouse location management:
- Add, edit, delete warehouses with capacity limits
- View current stock count per warehouse

#### `Inventory.jsx`
Real-time stock level viewer across all warehouses:
- Filter by warehouse or search by product
- Shows current stock vs minimum stock thresholds with color-coded status badges
- Trigger manual stock adjustments (manager+)
- Shows banner alerts for low/out-of-stock items

#### `StockIn.jsx`
Purchase receiving form:
- Select supplier, date, and one or more products with warehouse destination
- Enter quantity, batch number, expiry date, and unit cost
- Submit creates a `StockIn` transaction and updates inventory
- Logs history table of all past stock-ins below the form

#### `StockOut.jsx`
Sales/dispatch form:
- Enter customer name, date, and select products + quantities to dispatch
- Validates stock availability before allowing submission
- Logs history table of all past stock-outs

#### `StockTransfer.jsx`
Inter-warehouse transfer form:
- Select source and destination warehouse (must be different)
- Select products and quantities to move
- Backend validates warehouse capacity before allowing the move
- Logs history table of all transfers

#### `Reports.jsx`
Export and preview system data:
- Three tabs: **Inventory Stock**, **Stock In Logs**, **Stock Out Logs**
- Live searchable preview table in the browser
- Export each tab as Excel or PDF

#### `Users.jsx` (Admin only)
User account management:
- View all system users with their role and status
- Add new users with specific roles
- Edit users (change role, name, email, reset password)
- Deactivate users

#### `AuditLogs.jsx` (Admin + Manager)
Full audit trail viewer:
- Filter by user, action type, resource type, and date range
- Paginated table showing every logged system action
- Each row shows the timestamp, user, action, resource, description, and IP address

---

## 🔄 Data Flow Example: "Stock In" Transaction

```
User fills StockIn form
        │
        ▼
StockIn.jsx calls api.post('/transactions/stock-in', payload)
        │
        ▼
FastAPI transactions.py validates supplier, products, warehouse capacity
        │
        ▼
Creates StockIn + StockInItems records in DB
Updates inventory.current_stock for each product+warehouse
Records InventoryMovement entries for audit trail
Calls check_and_trigger_notifications() for each product
Calls log_action() to record the event in audit_logs
        │
        ▼
Returns the new StockIn record as JSON
        │
        ▼
StockIn.jsx refreshes the history table below the form
Bell badge in Navbar updates within 30 seconds
```

---

## 🔐 Security Model Summary

```
Every API request:
  → Check for Authorization header
  → Decode JWT token
  → Verify token not expired
  → Load user from database
  → Check role meets route minimum requirement
  → Process request
```

| Route Type | Minimum Role |
|---|---|
| View inventory, products, stock | Staff |
| Create/edit/delete products, adjust stock | Manager |
| User management | Admin |
| Audit log viewing | Manager |

