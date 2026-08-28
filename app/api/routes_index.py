from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.models.db_models import IndexValue

router = APIRouter(prefix="/index", tags=["Airfare Index"])


@router.get("/")
def get_latest_indices(
    method: Optional[str] = Query(None, description="Filter by method: Dutot, Jevons, DGCA_Weighted_Dutot"),
    db: Session = Depends(get_db)
):
    """
    GET /index: Returns the latest calculated airfare inflation index per route
    as well as the national composite index.
    """
    # Subquery to find maximum date per route & method
    subquery = (
        db.query(
            IndexValue.route,
            IndexValue.method,
            func.max(IndexValue.date).label("max_date")
        )
        .group_by(IndexValue.route, IndexValue.method)
        .subquery()
    )

    query = (
        db.query(IndexValue)
        .join(
            subquery,
            (IndexValue.route == subquery.c.route) &
            (IndexValue.method == subquery.c.method) &
            (IndexValue.date == subquery.c.max_date)
        )
    )

    if method:
        query = query.filter(IndexValue.method == method)

    latest_values = query.all()

    return {
        "count": len(latest_values),
        "data": [
            {
                "id": rec.id,
                "route": rec.route or "ALL_INDIA_COMPOSITE",
                "date": rec.date.strftime("%Y-%m-%d"),
                "index_value": rec.index_value,
                "method": rec.method,
                "sample_size": rec.sample_size,
                "base_period": rec.base_period,
                "base_period_is_real_data": getattr(rec, "base_period_is_real_data", True),
                "created_at": rec.created_at.isoformat(),
                "metadata": rec.metadata_json
            }
            for rec in latest_values
        ]
    }


@router.get("/{route}")
def get_route_history(
    route: str,
    method: Optional[str] = Query(None, description="Filter by method: Dutot, Jevons"),
    limit: int = Query(60, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    GET /index/{route}: Returns chronological historical index time series for a specified route (e.g. DEL-BOM).
    """
    formatted_route = route.upper().strip()
    query = db.query(IndexValue).filter(IndexValue.route == formatted_route)

    if method:
        query = query.filter(IndexValue.method == method)

    history = query.order_by(IndexValue.date.desc(), IndexValue.id.desc()).limit(limit).all()

    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No index history records found for route '{formatted_route}'"
        )

    return {
        "route": formatted_route,
        "records_count": len(history),
        "history": [
            {
                "id": rec.id,
                "date": rec.date.strftime("%Y-%m-%d"),
                "index_value": rec.index_value,
                "method": rec.method,
                "sample_size": rec.sample_size,
                "base_period": rec.base_period,
                "base_period_is_real_data": getattr(rec, "base_period_is_real_data", True),
                "created_at": rec.created_at.isoformat(),
                "metadata": rec.metadata_json
            }
            for rec in history
        ]
    }
