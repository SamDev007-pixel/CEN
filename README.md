# MoSPI Airfare Index System

An automated data scraping, cleaning, outlier filtering, and statistical index computation engine (Dutot / Jevons / DGCA-weighted indices) for tracking airfares across domestic flight routes.

## Architecture

```
mospi-airfare-index/
├── app/
│   ├── main.py                  # FastAPI app entrypoint, mounts routers
│   ├── config.py                # settings (routes, horizons, DB URL, scrape schedule)
│   │
│   ├── scraping/
│   │   ├── __init__.py
│   │   ├── flight_client.py     # wraps fast-flights calls
│   │   ├── scheduler.py         # runs scrapes across route x horizon matrix
│   │   └── raw_store.py         # writes raw responses + hash + timestamp + source
│   │
│   ├── processing/
│   │   ├── __init__.py
│   │   ├── normalize.py         # strips ancillary fees -> base fare + tax
│   │   ├── outliers.py          # Z-score / Isolation Forest filtering
│   │   └── index_engine.py      # Dutot/Jevons calc, DGCA weighting
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── db_models.py         # SQLAlchemy models: RawFare, CleanFare, IndexValue
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes_index.py      # GET /index, /index/{route}
│   │   ├── routes_audit.py      # GET /audit (data lineage, outlier flags)
│   │   └── routes_export.py     # GET /export (CSV/JSON for NSO format)
│   │
│   └── db.py                    # DB session/engine setup
│
├── scripts/
│   └── run_daily_scrape.py      # standalone script/cron entrypoint
│
├── tests/
│   └── ...
│
├── .env                         # DB URL, secrets
├── requirements.txt
└── README.md
```

## Quickstart

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run FastAPI Server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Trigger Scrape Manually**
   ```bash
   python scripts/run_daily_scrape.py
   ```

4. **API Endpoints**
   - API Docs: `http://localhost:8000/docs`
   - Index Metrics: `http://localhost:8000/index`
   - Audit / Lineage: `http://localhost:8000/audit`
   - NSO Export: `http://localhost:8000/export`
