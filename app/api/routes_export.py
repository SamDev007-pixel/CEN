import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.db_models import IndexValue

router = APIRouter(prefix="/export", tags=["MoSPI / NSO Export"])


@router.get("/")
def export_index_table(
    format: str = Query("json", pattern="^(json|csv)$", description="Export format: csv or json"),
    method: Optional[str] = Query(None, description="Filter by method: Dutot, Jevons, DGCA_Weighted_Dutot"),
    db: Session = Depends(get_db)
):
    """
    GET /export?format=csv|json: Dumps the IndexValue table formatted
    for official MoSPI / NSO statistical CPI integration.
    """
    query = db.query(IndexValue).order_by(IndexValue.date.asc(), IndexValue.id.asc())
    if method:
        query = query.filter(IndexValue.method == method)

    indices = query.all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Standard MoSPI / COICOP Economic Statistics CSV Header
        writer.writerow([
            "index_id",
            "period_date",
            "coicop_classification",
            "commodity_description",
            "route_code",
            "aggregation_formula",
            "base_period",
            "base_period_is_real_data",
            "index_value",
            "observation_sample_size",
            "created_at"
        ])

        for idx in indices:
            writer.writerow([
                idx.id,
                idx.date.strftime("%Y-%m-%d"),
                "07.3.3.1",
                "Passenger Transport by Air - Domestic Scheduled",
                idx.route or "ALL_INDIA_COMPOSITE",
                idx.method,
                idx.base_period,
                getattr(idx, "base_period_is_real_data", True),
                f"{idx.index_value:.4f}",
                idx.sample_size,
                idx.created_at.isoformat()
            ])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=mospi_airfare_index_series.csv"}
        )

    # JSON export format
    return {
        "dataset_name": "MoSPI Domestic Airfare Consumer Price Sub-Index",
        "ministry": "Ministry of Statistics and Programme Implementation",
        "coicop_item_code": "07.3.3.1",
        "total_records": len(indices),
        "data": [
            {
                "id": idx.id,
                "date": idx.date.strftime("%Y-%m-%d"),
                "route": idx.route or "ALL_INDIA_COMPOSITE",
                "method": idx.method,
                "index_value": idx.index_value,
                "base_period": idx.base_period,
                "base_period_is_real_data": getattr(idx, "base_period_is_real_data", True),
                "sample_size": idx.sample_size,
                "metadata": idx.metadata_json,
                "created_at": idx.created_at.isoformat()
            }
            for idx in indices
        ]
    }
