from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, auth
from ..audit_helper import log_action

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[schemas.CategoryOut])
def get_categories(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_staff_or_above)
):
    query = db.query(models.Category)
    if search:
        query = query.filter(models.Category.name.like(f"%{search}%"))
    return query.order_by(models.Category.name.asc()).all()

@router.post("", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category: schemas.CategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    # Check if category already exists
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    db_category = models.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    log_action(
        db,
        user=current_user,
        action="create",
        resource="categories",
        resource_id=str(db_category.id),
        details=f"Created category '{db_category.name}'",
        request=request
    )
    
    return db_category

@router.put("/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: int,
    category_data: schemas.CategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    # Check name duplicate if it's changing
    if category_data.name != db_category.name:
        existing = db.query(models.Category).filter(models.Category.name == category_data.name).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category with this name already exists")
            
    old_name = db_category.name
    db_category.name = category_data.name
    db_category.description = category_data.description
    
    db.commit()
    db.refresh(db_category)
    
    log_action(
        db,
        user=current_user,
        action="update",
        resource="categories",
        resource_id=str(db_category.id),
        details=f"Updated category name from '{old_name}' to '{db_category.name}'",
        request=request
    )
    
    return db_category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    request: Request,
    force: bool = Query(False, description="Force delete category and its products"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager_or_admin)
):

    # Fetch category
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    # Count products linked to category
    products_count = db.query(models.Product).filter(models.Product.category_id == category_id).count()
    if products_count > 0:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category because it is referenced by existing products"
            )
        # Force deletion: remove associated products
        db.query(models.Product).filter(models.Product.category_id == category_id).delete(synchronize_session=False)
        db.commit()
    # Delete category
    cat_id = db_category.id
    cat_name = db_category.name
    db.delete(db_category)
    db.commit()
    # Log deletion
    log_action(
        db,
        user=current_user,
        action="delete",
        resource="categories",
        resource_id=str(cat_id),
        details=f"Deleted category '{cat_name}'",
        request=request
    )
    return None
