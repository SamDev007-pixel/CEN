import logging
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import RawFare, CleanFare

logger = logging.getLogger(__name__)

# Indian domestic aviation statutory tax estimate.
# Typical breakdown: ~5% GST on base fare + airport charges (UDF, PSF, ADF).
# This averages roughly 15% of total ticket price across carriers and routes.
# Used ONLY when the data source provides no real breakdown (e.g., Google Flights).
ESTIMATED_TAX_FRACTION = 0.15


class FareNormalizer:
    """
    Normalizes raw fare structures.

    Google Flights (via fast-flights) returns ONLY a total price — no
    base-fare / tax / ancillary breakdown is available.

    This normalizer:
      - Stores total_price as the canonical fare (what the index engine uses).
      - Applies an *estimated* 85/15 base/tax split for informational
        display, and flags it with tax_estimated = True.
      - If a future data source provides real fields, uses them directly
        and sets tax_estimated = False.
    """

    def normalize_single_flight(self, raw_fare: RawFare, flight_dict: Dict[str, Any]) -> CleanFare:
        total_price = float(flight_dict.get("total_price") or flight_dict.get("price") or 0.0)

        # --- Tax / base-fare decomposition ---
        # Check if the raw payload contains a REAL breakdown from the source
        has_real_breakdown = (
            "base_fare" in flight_dict
            and "tax" in flight_dict
            and flight_dict["base_fare"] is not None
            and flight_dict["tax"] is not None
        )

        if has_real_breakdown:
            base_fare = float(flight_dict["base_fare"])
            tax = float(flight_dict["tax"])
            tax_estimated = False
        else:
            # No real breakdown available — apply labelled estimate
            tax = round(total_price * ESTIMATED_TAX_FRACTION, 2)
            base_fare = round(total_price - tax, 2)
            tax_estimated = True

        # Ancillary fees (baggage, meals, seats) — dropped from core inflation price
        ancillary_fees = float(flight_dict.get("ancillary_fees", 0.0))

        route = f"{raw_fare.origin}-{raw_fare.destination}"

        return CleanFare(
            source_raw_fare_id=raw_fare.id,
            route=route,
            date=raw_fare.travel_date,
            horizon=raw_fare.booking_horizon_days,
            airline=flight_dict.get("airline", "Unknown"),
            flight_number=flight_dict.get("flight_number"),
            base_fare=base_fare,
            tax=tax,
            total_price=total_price,
            ancillary_fees=ancillary_fees,
            tax_estimated=tax_estimated,
            is_outlier=False,
            outlier_reason=None,
            outlier_score=None,
            cleaned_at=datetime.datetime.utcnow()
        )

    def process_raw_fares(self, db: Session, raw_records: Optional[List[RawFare]] = None) -> int:
        """
        Processes unnormalized raw fares and writes CleanFare rows into DB.
        """
        if raw_records is None:
            # Query raw fares that haven't been cleaned yet
            cleaned_raw_ids = {r[0] for r in db.query(CleanFare.source_raw_fare_id).distinct().all() if r[0]}
            raw_records = db.query(RawFare).filter(~RawFare.id.in_(cleaned_raw_ids)).all() if cleaned_raw_ids else db.query(RawFare).all()

        total_cleaned = 0
        for raw in raw_records:
            payload = raw.raw_payload or {}
            flights = payload.get("flights", [])
            for flight_data in flights:
                clean_fare = self.normalize_single_flight(raw, flight_data)
                db.add(clean_fare)
                total_cleaned += 1

        db.commit()
        logger.info(f"Successfully normalized {total_cleaned} clean fares from {len(raw_records)} raw records.")
        return total_cleaned
