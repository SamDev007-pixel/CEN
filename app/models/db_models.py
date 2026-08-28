import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db import Base


class RawFare(Base):
    """
    Audit trail model storing untouched raw scraped responses.
    """
    __tablename__ = "raw_fares"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    source = Column(String(50), default="google_flights", nullable=False)
    origin = Column(String(10), index=True, nullable=False)
    destination = Column(String(10), index=True, nullable=False)
    travel_date = Column(DateTime, nullable=False, index=True)
    booking_horizon_days = Column(Integer, nullable=False, index=True)
    raw_payload = Column(JSON, nullable=False)
    payload_hash = Column(String(64), unique=True, index=True, nullable=False)

    clean_fares = relationship("CleanFare", back_populates="raw_fare", cascade="all, delete-orphan")


class CleanFare(Base):
    """
    Cleaned, normalized airfare observations stripped of ancillary fees.
    """
    __tablename__ = "clean_fares"

    id = Column(Integer, primary_key=True, index=True)
    source_raw_fare_id = Column(Integer, ForeignKey("raw_fares.id"), nullable=True, index=True)
    route = Column(String(20), index=True, nullable=False)  # e.g., "DEL-BOM"
    date = Column(DateTime, nullable=False, index=True)  # travel_date
    horizon = Column(Integer, nullable=False, index=True)  # booking horizon days
    airline = Column(String(100), nullable=False, index=True)
    flight_number = Column(String(50), nullable=True)
    
    base_fare = Column(Float, nullable=False)
    tax = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False)
    ancillary_fees = Column(Float, nullable=False, default=0.0)
    tax_estimated = Column(Boolean, default=True, nullable=False,
                           comment="True if base_fare/tax split is estimated (source only provides total_price)")
    
    is_outlier = Column(Boolean, default=False, index=True)
    outlier_reason = Column(String(100), nullable=True)
    outlier_score = Column(Float, nullable=True)
    
    cleaned_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    raw_fare = relationship("RawFare", back_populates="clean_fares")


class IndexValue(Base):
    """
    Computed airfare price index series (Dutot / Jevons / Composite).
    """
    __tablename__ = "index_values"

    id = Column(Integer, primary_key=True, index=True)
    route = Column(String(20), index=True, nullable=True)  # Nullable for composite national index
    date = Column(DateTime, nullable=False, index=True)  # Period date
    index_value = Column(Float, nullable=False)
    method = Column(String(50), default="Dutot", nullable=False, index=True)  # Dutot, Jevons, DGCA_Weighted
    sample_size = Column(Integer, nullable=False, default=0)
    base_period = Column(String(50), default="2026-08-28")
    base_period_is_real_data = Column(Boolean, default=True, nullable=False,
                                      comment="True if base period and P0 were established from real scraped data")
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
