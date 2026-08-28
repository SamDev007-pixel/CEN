import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.scraping.scheduler import ScrapeScheduler
from app.api.routes_index import router as index_router
from app.api.routes_audit import router as audit_router
from app.api.routes_export import router as export_router

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mospi-airfare-index")

scheduler_instance = ScrapeScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database schema...")
    init_db()
    
    # Start APScheduler background scraping job
    logger.info("Starting background APScheduler...")
    scheduler_instance.start_scheduler()
    logger.info("MoSPI Airfare Index backend initialized successfully.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down background scheduler...")
    scheduler_instance.stop_scheduler()


app = FastAPI(
    title="MoSPI Domestic Airfare Index System",
    description=(
        "Automated high-frequency civil aviation airfare scraper, outlier filter, "
        "and Dutot/Jevons price index computation engine for MoSPI / NSO CPI aggregation."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for external Frontend / UI (e.g. Next.js, React, Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API Routers
app.include_router(index_router)
app.include_router(audit_router)
app.include_router(export_router)


@app.get("/", tags=["Health & Status"])
def root():
    return {
        "status": "online",
        "service": "MoSPI Airfare Index Engine",
        "version": "1.0.0",
        "routes_monitored": settings.routes_list,
        "booking_horizons_days": settings.horizons_list,
        "endpoints": {
            "latest_index": "/index",
            "route_history": "/index/{route}",
            "audit_overview": "/audit",
            "route_audit_lineage": "/audit/{route}",
            "export_table": "/export?format=csv|json",
            "swagger_docs": "/docs"
        }
    }
