import sys
sys.path.insert(0, ".")
from app.db import SessionLocal
from app.models.db_models import IndexValue
from app.processing.index_engine import IndexEngine

db = SessionLocal()

# Clear previous index records generated under the hardcoded 2024 baseline
deleted_count = db.query(IndexValue).delete()
db.commit()
print(f"Cleared {deleted_count} stale placeholder index rows.")

# Recompute fresh index rows with real Day 1 baseline
engine = IndexEngine()
new_records = engine.compute_indices_for_date(db)
print(f"Successfully computed {len(new_records)} index values referencing real baseline data.")

db.close()
