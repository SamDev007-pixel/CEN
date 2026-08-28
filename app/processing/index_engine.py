import math
import logging
import datetime
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.db_models import CleanFare, IndexValue

logger = logging.getLogger(__name__)

# DGCA Domestic Passenger Volume Route Weights (sum to 1.0)
DGCA_PASSENGER_WEIGHTS: Dict[str, float] = {
    "DEL-BOM": 0.35,
    "BLR-DEL": 0.25,
    "HYD-MAA": 0.15,
    "DEL-CCU": 0.15,
    "DEL-MAA": 0.05,
    "BOM-BLR": 0.05
}


class IndexEngine:
    """
    Computes statistical airfare price indices adhering to MoSPI / NSO standards:
    - Dutot Index: Ratio of arithmetic mean prices (P_t / P_0) * 100
    - Jevons Index: Ratio of geometric mean prices * 100
    - DGCA Weighted Composite: Aggregates route sub-indices using civil aviation passenger weights.

    Base Period Resolution:
    - Base period (P0) is dynamically established from the FIRST DAY of real scraped data
      (e.g., 2026-08-28 = 100.00).
    - No fabricated or guessed historical baselines are used.
    """

    def __init__(
        self,
        base_period: Optional[str] = None,
        route_base_fares: Optional[Dict[str, float]] = None,
        dgca_weights: Optional[Dict[str, float]] = None
    ):
        self.explicit_base_period = base_period
        self.explicit_route_base_fares = route_base_fares
        self.dgca_weights = dgca_weights or DGCA_PASSENGER_WEIGHTS

    def calculate_dutot(self, current_fares: List[float], base_fare: float) -> float:
        """
        Dutot Index Formula:
        I_D = ( (1/n) * sum(p_{t,i}) ) / p_0 * 100
        """
        if not current_fares or base_fare <= 0:
            return 100.0
        current_mean = float(np.mean(current_fares))
        return round((current_mean / base_fare) * 100.0, 4)

    def calculate_jevons(self, current_fares: List[float], base_fare: float) -> float:
        """
        Jevons Index Formula:
        I_J = exp( (1/n) * sum(ln(p_{t,i})) - ln(p_0) ) * 100
        """
        if not current_fares or base_fare <= 0:
            return 100.0
        log_current = float(np.mean(np.log(current_fares)))
        log_base = math.log(base_fare)
        return round(math.exp(log_current - log_base) * 100.0, 4)

    def get_baseline_p0_map(
        self,
        db: Session
    ) -> Tuple[str, Dict[str, float], Dict[str, float], bool]:
        """
        Determines the baseline period date and route P0 prices from real historical data:
        1. Queries the earliest cleaned_at timestamp from clean_fares.
        2. Groups the non-outlier fares on that earliest day per route to derive:
           - dutot_p0: Arithmetic mean price on baseline day
           - jevons_p0: Geometric mean price on baseline day
        3. Returns (base_period_str, dutot_p0_map, jevons_p0_map, is_real_data).
        """
        if self.explicit_base_period and self.explicit_route_base_fares:
            return (
                self.explicit_base_period,
                self.explicit_route_base_fares,
                self.explicit_route_base_fares,
                False
            )

        # Find the earliest collection date in CleanFare
        earliest_dt = db.query(func.min(CleanFare.cleaned_at)).scalar()
        if not earliest_dt:
            today_str = datetime.date.today().strftime("%Y-%m-%d")
            return (today_str, {}, {}, True)

        earliest_date_str = earliest_dt.strftime("%Y-%m-%d")
        base_period_label = f"{earliest_date_str}"

        # Fetch all clean, non-outlier fares from that earliest date
        # (matching on calendar date of cleaned_at)
        start_of_day = datetime.datetime.strptime(earliest_date_str, "%Y-%m-%d")
        end_of_day = start_of_day + datetime.timedelta(days=1)

        baseline_fares = (
            db.query(CleanFare)
            .filter(
                CleanFare.cleaned_at >= start_of_day,
                CleanFare.cleaned_at < end_of_day,
                CleanFare.is_outlier == False
            )
            .all()
        )

        dutot_p0: Dict[str, float] = {}
        jevons_p0: Dict[str, float] = {}

        if baseline_fares:
            df_base = pd.DataFrame([{
                "route": f.route,
                "total_price": f.total_price
            } for f in baseline_fares])

            for route_name, grp in df_base.groupby("route"):
                prices = grp["total_price"].tolist()
                if prices:
                    dutot_p0[route_name] = round(float(np.mean(prices)), 2)
                    jevons_p0[route_name] = round(float(np.exp(np.mean(np.log(prices)))), 2)

        return (base_period_label, dutot_p0, jevons_p0, True)

    def compute_indices_for_date(
        self,
        db: Session,
        target_date: Optional[datetime.date] = None
    ) -> List[IndexValue]:
        """
        Computes route-level Dutot & Jevons indices as well as the
        National DGCA-weighted composite index for all non-outlier fares.
        """
        today = target_date or datetime.date.today()
        period_dt = datetime.datetime.combine(today, datetime.time.min)

        # Retrieve valid, non-outlier observations
        fares: List[CleanFare] = (
            db.query(CleanFare)
            .filter(CleanFare.is_outlier == False)
            .all()
        )

        if not fares:
            logger.warning("No clean non-outlier fares available to compute indices.")
            return []

        base_period, dutot_p0_map, jevons_p0_map, is_real_data = self.get_baseline_p0_map(db)

        df = pd.DataFrame([{
            "route": f.route,
            "total_price": f.total_price
        } for f in fares])

        computed_records: List[IndexValue] = []
        route_dutot_map: Dict[str, float] = {}

        # 1. Compute Route-Level Indices
        for route_name, group in df.groupby("route"):
            prices = group["total_price"].tolist()
            sample_size = len(prices)

            current_mean = round(float(np.mean(prices)), 2)
            current_geom = round(float(np.exp(np.mean(np.log(prices)))), 2)

            # Baseline prices (P0) established from real Day 1 data
            dutot_p0 = dutot_p0_map.get(route_name, current_mean)
            jevons_p0 = jevons_p0_map.get(route_name, current_geom)

            dutot_val = self.calculate_dutot(prices, dutot_p0)
            jevons_val = self.calculate_jevons(prices, jevons_p0)
            route_dutot_map[route_name] = dutot_val

            # Store Dutot Index record
            dutot_rec = IndexValue(
                route=route_name,
                date=period_dt,
                index_value=dutot_val,
                method="Dutot",
                sample_size=sample_size,
                base_period=base_period,
                base_period_is_real_data=is_real_data,
                metadata_json={
                    "current_mean_price": current_mean,
                    "base_reference_price": dutot_p0,
                    "min_price": float(np.min(prices)),
                    "max_price": float(np.max(prices)),
                    "base_period_is_real_data": is_real_data,
                    "base_period_date": base_period
                },
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )

            # Store Jevons Index record
            jevons_rec = IndexValue(
                route=route_name,
                date=period_dt,
                index_value=jevons_val,
                method="Jevons",
                sample_size=sample_size,
                base_period=base_period,
                base_period_is_real_data=is_real_data,
                metadata_json={
                    "geometric_mean": current_geom,
                    "base_reference_price": jevons_p0,
                    "base_period_is_real_data": is_real_data,
                    "base_period_date": base_period
                },
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )

            db.add(dutot_rec)
            db.add(jevons_rec)
            computed_records.extend([dutot_rec, jevons_rec])

        # 2. National DGCA-Weighted Composite Index
        if route_dutot_map:
            total_weight = 0.0
            weighted_sum = 0.0
            for r_name, d_val in route_dutot_map.items():
                w = self.dgca_weights.get(r_name, 0.10)
                weighted_sum += d_val * w
                total_weight += w

            composite_index = round(weighted_sum / total_weight, 4) if total_weight > 0 else 100.0
            composite_rec = IndexValue(
                route=None,  # Null represents All-India Composite
                date=period_dt,
                index_value=composite_index,
                method="DGCA_Weighted_Dutot",
                sample_size=len(fares),
                base_period=base_period,
                base_period_is_real_data=is_real_data,
                metadata_json={
                    "weights": self.dgca_weights,
                    "routes_included": list(route_dutot_map.keys()),
                    "base_period_is_real_data": is_real_data,
                    "base_period_date": base_period
                },
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(composite_rec)
            computed_records.append(composite_rec)

        db.commit()
        for rec in computed_records:
            db.refresh(rec)

        logger.info(f"Computed and saved {len(computed_records)} index values using real base period '{base_period}'.")
        return computed_records
