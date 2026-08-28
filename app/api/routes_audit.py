from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.db_models import RawFare, CleanFare

router = APIRouter(prefix="/audit", tags=["Data Lineage & Audit"])


@router.get("/")
def get_audit_overview(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns general audit overview across all routes including total scrapes and outlier stats.
    """
    total_raw = db.query(RawFare).count()
    total_clean = db.query(CleanFare).count()
    total_outliers = db.query(CleanFare).filter(CleanFare.is_outlier == True).count()
    
    recent_raw = (
        db.query(RawFare)
        .order_by(RawFare.timestamp.desc())
        .limit(limit)
        .all()
    )

    return {
        "summary": {
            "total_raw_scrapes": total_raw,
            "total_clean_observations": total_clean,
            "total_outliers_flagged": total_outliers,
            "outlier_rate_pct": round((total_outliers / total_clean * 100), 2) if total_clean > 0 else 0.0
        },
        "recent_scrapes": [
            {
                "raw_id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "source": r.source,
                "origin": r.origin,
                "destination": r.destination,
                "travel_date": r.travel_date.strftime("%Y-%m-%d"),
                "booking_horizon_days": r.booking_horizon_days,
                "payload_hash": r.payload_hash,
                "quotes_count": len((r.raw_payload or {}).get("flights", []))
            }
            for r in recent_raw
        ]
    }


@router.get("/{route}")
def get_route_audit_lineage(
    route: str,
    only_outliers: bool = Query(False, description="Filter solely to outlier flagged observations"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    GET /audit/{route}: Returns raw fares and cleaned observations for a specific route,
    identifying which quotes were flagged as outliers and why, complete with SHA-256 payload lineage.
    """
    formatted_route = route.upper().strip()
    query = db.query(CleanFare).filter(CleanFare.route == formatted_route)

    if only_outliers:
        query = query.filter(CleanFare.is_outlier == True)

    clean_fares = query.order_by(CleanFare.date.desc(), CleanFare.id.desc()).limit(limit).all()

    if not clean_fares and not db.query(CleanFare).filter(CleanFare.route == formatted_route).first():
        raise HTTPException(
            status_code=404,
            detail=f"No audit or fare records found for route '{formatted_route}'"
        )

    lineage_records = []
    for f in clean_fares:
        raw_rec = f.raw_fare
        lineage_records.append({
            "clean_fare_id": f.id,
            "route": f.route,
            "travel_date": f.date.strftime("%Y-%m-%d"),
            "horizon_days": f.horizon,
            "airline": f.airline,
            "flight_number": f.flight_number,
            "base_fare": f.base_fare,
            "tax": f.tax,
            "tax_estimated": f.tax_estimated,
            "total_price": f.total_price,
            "ancillary_fees_dropped": f.ancillary_fees,
            "is_outlier": f.is_outlier,
            "outlier_reason": f.outlier_reason,
            "outlier_score": f.outlier_score,
            "cleaned_at": f.cleaned_at.isoformat(),
            "lineage": {
                "source_raw_fare_id": f.source_raw_fare_id,
                "scrape_timestamp": raw_rec.timestamp.isoformat() if raw_rec else None,
                "source_engine": raw_rec.source if raw_rec else None,
                "sha256_payload_hash": raw_rec.payload_hash if raw_rec else None
            }
        })

    outlier_count = sum(1 for rec in lineage_records if rec["is_outlier"])

    return {
        "route": formatted_route,
        "sample_count": len(lineage_records),
        "outlier_count": outlier_count,
        "observations": lineage_records
    }
