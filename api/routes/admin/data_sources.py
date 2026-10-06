from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import DataSource
from api.schemas import (
    DataSourceSchema,
    DataSourceCreateSchema,
    DataSourceUpdateSchema,
)

router = APIRouter()

@router.get("/data-sources", response_model=List[DataSourceSchema])
def get_data_sources(
    category: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all data sources with optional filtering."""
    query = db.query(DataSource)
    if category:
        query = query.filter(DataSource.category == category)
    if is_active is not None:
        query = query.filter(DataSource.is_active == is_active)
    return query.order_by(DataSource.category, DataSource.name).all()

@router.post("/data-sources", response_model=DataSourceSchema, status_code=status.HTTP_201_CREATED)
def create_data_source(source_data: DataSourceCreateSchema, db: Session = Depends(get_db)):
    """Create a new data source."""
    existing = db.query(DataSource).filter(DataSource.url == source_data.url).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Data source URL already exists")
    
    new_source = DataSource(**source_data.dict())
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    return new_source

@router.get("/data-sources/{source_id}", response_model=DataSourceSchema)
def get_data_source(source_id: int, db: Session = Depends(get_db)):
    """Get a specific data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    return source

@router.patch("/data-sources/{source_id}", response_model=DataSourceSchema)
def update_data_source(source_id: int, update: DataSourceUpdateSchema, db: Session = Depends(get_db)):
    """Update a data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    db.commit()
    db.refresh(source)
    return source

@router.delete("/data-sources/{source_id}")
def delete_data_source(source_id: int, db: Session = Depends(get_db)):
    """Delete a data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    db.delete(source)
    db.commit()
    return {"message": "Data source deleted successfully"}
