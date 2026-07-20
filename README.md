# WMS CORE - Enterprise Warehouse Management System

WMS CORE is a modern, responsive, and robust **Warehouse Management System (WMS)** built for enterprise-level inventory tracking, warehouse optimization, multi-location stock movements, and detailed audit trailing. Equipped with Role-Based Access Control (RBAC), real-time alerts, and automated PDF/Excel reports generation, it provides full visibility into your supply chain.

---

## 🌟 Key Features

### 1. Unified Real-Time Dashboard
*   **KPI Metrics Grid**: Live tracking of total products, categories, suppliers, warehouses, total stock count, stock valuations, and active warnings.
*   **Analytics Charts**: Visual stock breakdown by categories and warehouse capacities using interactive graphs.
*   **Recent Activity**: Real-time log of the 10 latest inventory movements.

### 2. Multi-Warehouse & Stock Management
*   **Multi-Location Tracking**: Manage inventory across multiple warehouses, each with a defined maximum storage capacity.
*   **Stock In (Receiving)**: Document incoming vendor supply, associate batch numbers, register expiry dates, and dynamically recalculate product cost prices.
*   **Stock Out (Issuing)**: Issue stock to customers with auto-calculated values based on current inventory pricing.
*   **Stock Transfer**: Safely move items between warehouses with automated capacity validation to prevent over-fill issues.
*   **Manual Adjustments**: Perform manual stock counts and adjustments with fully tracked audit logs.

### 3. Smart Warning & Alerts System
*   **Low Stock Alerts**: Automatically triggers when the combined stock of a product falls below its minimum threshold.
*   **Out of Stock Alerts**: Real-time warnings when a product is completely depleted.
*   **Expiring Soon Alerts**: Tracks products with an expiry date and flags items expiring within 30 days.
*   **Dynamic Notification Drawer**: Instantly review and mark alerts as read from the top navigation bar.

### 4. Role-Based Access Control (RBAC)
*   **Administrator**: Full administrative control, including user management, role assignments, audit logs, and settings.
*   **Manager**: Manage inventory, products, categories, suppliers, transfers, and review audit trails.
*   **Staff**: Record stock-ins, stock-outs, transfers, and check inventory levels.

### 5. Audit Logging & Compliance
*   Every critical action (creation, updates, deletion, adjustments, transactions) is logged with:
    *   IP Address & User Agent
    *   Timestamp and executing user
    *   Detailed action context payload

### 6. Reports & Data Exporting
*   Export complete tabular data into beautifully formatted **Excel Spreadsheet (.xlsx)** or **PDF Document** format for:
    *   Current Inventory Levels
    *   Stock In history logs
    *   Stock Out history logs

---

## 🛠 Tech Stack

*   **Backend**: Python, FastAPI, SQLAlchemy ORM, Uvicorn, PyMySQL (MySQL connector), Pydantic
*   **Database**: MySQL (relational schema with constraints, indexes, and cascades)
*   **Frontend**: React (Vite), Lucide Icons, Recharts (data visualizations), Axios

---

## 🚀 Setup & Installation Instructions

### Prerequisites
*   Python 3.8 or above
*   Node.js (v16+) and npm
*   MySQL Server (v8.0+)

---

### 1. Database Setup

1.  Create a new schema in MySQL:
    ```sql
    CREATE DATABASE warehouse_db;
    ```
2.  Import the initial SQL schema (optional, as FastAPI auto-creates tables on startup):
    ```bash
    mysql -u root -p warehouse_db < schema.sql
    ```

---

### 2. Backend Installation & Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a Python virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows**:
        ```powershell
        .\venv\Scripts\activate
        ```
    *   **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```
4.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Initialize the database tables and seed test data:
    ```bash
    python init_db.py
    ```
6.  Start the FastAPI development server:
    ```bash
    python -m uvicorn app.main:app --reload
    ```
    The API will now be running at `http://127.0.0.1:8000`. You can access the auto-generated documentation and API playground at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Installation & Setup

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install the required Node packages:
    ```bash
    npm install
    ```
3.  Start the Vite local development server:
    ```bash
    npm run dev
    ```
    The frontend will now be running at `http://localhost:5173`. Open this URL in your web browser.

---

## 🔐 Default Access Accounts

The database comes pre-seeded with the following default accounts (passwords are configured for a development environment):

| Role | Username | Password | Email | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | `admin@wms.com` | Full Control + User Management + Audit logs |
| **Warehouse Manager** | `manager` | `manager123` | `manager@wms.com` | Inventory Management + Reports + Audit logs |
| **Staff Member** | `staff` | `staff123` | `staff@wms.com` | Operations + Transactions + Stock logs |

---

## 📂 Project Directory Structure

```text
├── backend/
│   ├── app/
│   │   ├── routers/        # API route files (auth, inventory, products, etc.)
│   │   ├── auth.py         # OAuth2 and password hashing functions
│   │   ├── database.py     # Database session and connection setup
│   │   ├── main.py         # FastAPI main application file
│   │   ├── models.py       # SQLAlchemy database models definitions
│   │   └── schemas.py      # Pydantic validation schemas
│   ├── init_db.py          # Database initialization and seeding script
│   └── requirements.txt    # Python backend package dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable layout and notification drawer components
│   │   ├── context/        # React context (Auth and Theme providers)
│   │   ├── pages/          # Main page views (Dashboard, Products, Reports, etc.)
│   │   └── services/       # Axios API request configs
│   ├── package.json        # Frontend NPM configurations and scripts
│   └── vite.config.js      # Vite compiler and proxy configurations
│
└── schema.sql              # MySQL raw database initialization schema
```
