import logging
import datetime
import time
from typing import List, Optional
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.db import SessionLocal, init_db
from app.scraping.flight_client import FlightClient
from app.scraping.raw_store import RawStore
from app.processing.normalize import FareNormalizer
from app.processing.outliers import OutlierDetector
from app.processing.index_engine import IndexEngine

logger = logging.getLogger(__name__)


class ScrapeScheduler:
    """
    Coordinates matrix scraping across configured routes & booking horizons,
    normalizes raw flight quotes, removes statistical outliers, and generates price index values.
    Supports standalone execution and continuous cron scheduling via APScheduler.
    """

    def __init__(
        self,
        routes: Optional[List[str]] = None,
        horizons: Optional[List[int]] = None
    ):
        self.routes = routes or settings.routes_list
        self.horizons = horizons or settings.horizons_list
        self.flight_client = FlightClient()
        self.raw_store = RawStore()
        self.normalizer = FareNormalizer()
        self.outlier_detector = OutlierDetector()
        self.index_engine = IndexEngine()
        self.scheduler: Optional[BackgroundScheduler] = None

    def run_matrix_scrape(
        self,
        db: Optional[Session] = None,
        target_date: Optional[datetime.date] = None
    ) -> dict:
        """
        Executes one full sweep across Route x Horizon matrix:
        Routes: DEL-BOM, BLR-DEL, HYD-MAA
        Horizons: T+1, T+7, T+15, T+30, T+45
        """
        close_db_on_exit = False
        if db is None:
            db = SessionLocal()
            close_db_on_exit = True

        today = target_date or datetime.date.today()
        logger.info(f"Starting Route x Horizon matrix scrape for base date: {today}")

        scraped_raw_records = []

        try:
            for route_str in self.routes:
                parts = route_str.split("-")
                if len(parts) != 2:
                    logger.warning(f"Invalid route format: {route_str}, skipping.")
                    continue
                origin, destination = parts[0].strip().upper(), parts[1].strip().upper()

                for horizon in self.horizons:
                    travel_date = today + datetime.timedelta(days=horizon)
                    try:
                        logger.info(f"Scraping {route_str} @ T+{horizon} days ({travel_date})...")
                        payload = self.flight_client.fetch_flights(
                            origin=origin,
                            destination=destination,
                            departure_date=travel_date
                        )
                        raw_rec = self.raw_store.store_raw_response(
                            db=db,
                            origin=origin,
                            destination=destination,
                            travel_date=travel_date,
                            booking_horizon_days=horizon,
                            raw_payload=payload,
                            source="google_flights"
                        )
                        scraped_raw_records.append(raw_rec)
                        time.sleep(0.5)
                    except Exception as e:
                        logger.error(f"Error scraping {route_str} horizon {horizon}d: {e}")

            # 1. Normalize newly scraped records
            clean_count = self.normalizer.process_raw_fares(db, scraped_raw_records)

            # 2. Flag outliers with Z-score > 3 sigma
            outlier_ids = self.outlier_detector.flag_outliers_for_route(db)

            # 3. Compute Dutot, Jevons, and DGCA-weighted indices
            index_records = self.index_engine.compute_indices_for_date(db, target_date=today)

            summary = {
                "status": "success",
                "base_date": today.isoformat(),
                "routes": self.routes,
                "horizons": self.horizons,
                "raw_records_scraped": len(scraped_raw_records),
                "clean_fares_created": clean_count,
                "outliers_flagged": len(outlier_ids),
                "indices_generated": len(index_records)
            }
            logger.info(f"Matrix scrape completed successfully: {summary}")
            return summary

        finally:
            if close_db_on_exit:
                db.close()

    def start_scheduler(self):
        """
        Initializes and starts the APScheduler background cron job.
        """
        if self.scheduler and self.scheduler.running:
            return

        self.scheduler = BackgroundScheduler()
        # Parse cron expression (e.g., '0 2 * * *')
        cron_parts = settings.SCRAPE_SCHEDULE_CRON.split()
        if len(cron_parts) == 5:
            minute, hour, day, month, day_of_week = cron_parts
            trigger = CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week
            )
        else:
            trigger = CronTrigger(hour=2, minute=0)

        self.scheduler.add_job(
            self.run_matrix_scrape,
            trigger=trigger,
            id="daily_airfare_matrix_scrape",
            name="Daily Airfare Index Scrape Pipeline",
            replace_existing=True
        )
        self.scheduler.start()
        logger.info(f"Scraper scheduler started with cron schedule: {settings.SCRAPE_SCHEDULE_CRON}")

    def stop_scheduler(self):
        """Stops the APScheduler background worker."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scraper scheduler stopped.")
