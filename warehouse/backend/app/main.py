import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import auth, products, categories, suppliers, warehouses, inventory, transactions, reports, notifications, users

# Initialize static upload directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Warehouse Management System (WMS) API",
    description="RESTful API for backend WMS with OAuth2 and RBAC controls",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for product images
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")), name="static")

# Include Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(warehouses.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Warehouse Management System (WMS) API is up and running"
    }
