"""Inspect the newest RawFare and its corresponding CleanFares."""
import json
import sys
sys.path.insert(0, ".")
from app.db import SessionLocal
from app.models.db_models import RawFare, CleanFare

db = SessionLocal()

# --- Newest RawFare ---
raw = db.query(RawFare).order_by(RawFare.id.desc()).first()
print("=" * 60)
print("  NEWEST RAW FARE")
print("=" * 60)
print(f"  ID            : {raw.id}")
print(f"  Route         : {raw.origin}-{raw.destination}")
print(f"  Travel Date   : {raw.travel_date}")
print(f"  Horizon       : {raw.booking_horizon_days} days")
print(f"  Source        : {raw.source}")
print(f"  Timestamp     : {raw.timestamp}")
print(f"  Payload Hash  : {raw.payload_hash[:24]}...")
print()

payload = raw.raw_payload
flights = payload.get("flights", [])
print(f"  Flight Quotes : {len(flights)}")
print()

# Show first 5 flight quote dicts in full
for i, f in enumerate(flights[:5]):
    print(f"  --- Quote #{i+1} ---")
    print(json.dumps(f, indent=4))
    # Explicitly check for fabricated fields
    has_base = "base_fare" in f
    has_tax = "tax" in f
    has_ancillary = "ancillary_fees" in f
    print(f"  >> Contains 'base_fare'?     : {has_base}")
    print(f"  >> Contains 'tax'?           : {has_tax}")
    print(f"  >> Contains 'ancillary_fees'?: {has_ancillary}")
    print()

# --- Corresponding CleanFares ---
cleans = db.query(CleanFare).filter(CleanFare.source_raw_fare_id == raw.id).limit(5).all()
print("=" * 60)
print("  CORRESPONDING CLEAN FARES (first 5)")
print("=" * 60)
for c in cleans:
    print(f"  CleanFare ID   : {c.id}")
    print(f"  Airline        : {c.airline}")
    print(f"  Total Price    : {c.total_price}")
    print(f"  Base Fare      : {c.base_fare}")
    print(f"  Tax            : {c.tax}")
    print(f"  tax_estimated  : {c.tax_estimated}")
    print(f"  Is Outlier     : {c.is_outlier}")
    print(f"  ---")

db.close()
