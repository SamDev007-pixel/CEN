# MoSPI Domestic Airfare Index — Frontend API Documentation

**Base URL**: `http://127.0.0.1:8000`  
**Interactive Swagger UI**: `http://127.0.0.1:8000/docs`  
**CORS Status**: Enabled for `*`, `localhost:3000` (Next.js/React), `localhost:5173` (Vite), and all standard ports with credentials support.

---

## 1. System Health & Metadata

### `GET /`
Returns service status, monitored routes, booking horizons, and available API routes.

#### Response Example
```json
{
  "status": "online",
  "service": "MoSPI Airfare Index Engine",
  "version": "1.0.0",
  "routes_monitored": ["DEL-BOM", "BLR-DEL", "HYD-MAA", "DEL-MAA", "BOM-BLR", "DEL-CCU"],
  "booking_horizons_days": [1, 7, 15, 30, 45],
  "endpoints": {
    "latest_index": "/index",
    "route_history": "/index/{route}",
    "audit_overview": "/audit",
    "route_audit_lineage": "/audit/{route}",
    "export_table": "/export?format=csv|json",
    "swagger_docs": "/docs"
  }
}
```

---

## 2. Airfare Price Indices

### `GET /index`
Returns the latest calculated inflation index per route as well as the All-India Composite.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `method` | `string` | No | Filter by calculation formula: `Dutot`, `Jevons`, or `DGCA_Weighted_Dutot` |

#### Response Example
```json
{
  "count": 13,
  "data": [
    {
      "id": 1,
      "route": "BLR-DEL",
      "date": "2026-08-28",
      "index_value": 100.0,
      "method": "Dutot",
      "sample_size": 420,
      "base_period": "2026-08-28",
      "base_period_is_real_data": true,
      "created_at": "2026-08-28T17:56:55.804800",
      "metadata": {
        "current_mean_price": 9594.49,
        "base_reference_price": 9594.49,
        "min_price": 8554.0,
        "max_price": 13650.0,
        "base_period_is_real_data": true,
        "base_period_date": "2026-08-28"
      }
    },
    {
      "id": 13,
      "route": "ALL_INDIA_COMPOSITE",
      "date": "2026-08-28",
      "index_value": 100.0,
      "method": "DGCA_Weighted_Dutot",
      "sample_size": 1831,
      "base_period": "2026-08-28",
      "base_period_is_real_data": true,
      "created_at": "2026-08-28T17:56:55.808095",
      "metadata": {
        "weights": {
          "DEL-BOM": 0.35,
          "BLR-DEL": 0.25,
          "HYD-MAA": 0.15,
          "DEL-CCU": 0.15,
          "DEL-MAA": 0.05,
          "BOM-BLR": 0.05
        },
        "routes_included": ["BLR-DEL", "BOM-BLR", "DEL-BOM", "DEL-CCU", "DEL-MAA", "HYD-MAA"],
        "base_period_is_real_data": true,
        "base_period_date": "2026-08-28"
      }
    }
  ]
}
```

---

### `GET /index/{route}`
Returns the historical time series for a single route (e.g. `DEL-BOM`).

#### Path & Query Parameters
| Parameter | Type | In | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `string` | Path | **Yes** | Sector code, e.g. `DEL-BOM`, `BLR-DEL`, `DEL-CCU` |
| `method` | `string` | Query | No | Filter by method: `Dutot` or `Jevons` |
| `limit` | `integer` | Query | No | Max historical observations (default `60`, max `500`) |

#### Response Example
```json
{
  "route": "DEL-BOM",
  "records_count": 2,
  "history": [
    {
      "id": 5,
      "date": "2026-08-28",
      "index_value": 100.0,
      "method": "Dutot",
      "sample_size": 595,
      "base_period": "2026-08-28",
      "base_period_is_real_data": true,
      "created_at": "2026-08-28T17:56:55.805721",
      "metadata": {
        "current_mean_price": 6709.68,
        "base_reference_price": 6709.68,
        "min_price": 6074.0,
        "max_price": 7690.0,
        "base_period_is_real_data": true,
        "base_period_date": "2026-08-28"
      }
    },
    {
      "id": 6,
      "date": "2026-08-28",
      "index_value": 100.0001,
      "method": "Jevons",
      "sample_size": 595,
      "base_period": "2026-08-28",
      "base_period_is_real_data": true,
      "created_at": "2026-08-28T17:56:55.805820",
      "metadata": {
        "geometric_mean": 6704.85,
        "base_reference_price": 6704.85,
        "base_period_is_real_data": true,
        "base_period_date": "2026-08-28"
      }
    }
  ]
}
```

---

## 3. Data Lineage & Audit

### `GET /audit`
Returns high-level scraper health, total raw quotes, and outlier rejection rates.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `limit` | `integer` | No | Number of recent raw batches to return (default `50`, max `200`) |

#### Response Example
```json
{
  "summary": {
    "total_raw_scrapes": 31,
    "total_clean_observations": 1866,
    "total_outliers_flagged": 35,
    "outlier_rate_pct": 1.88
  },
  "recent_scrapes": [
    {
      "raw_id": 31,
      "timestamp": "2026-08-28T17:40:08.423880",
      "source": "google_flights",
      "origin": "BLR",
      "destination": "DEL",
      "travel_date": "2026-09-04",
      "booking_horizon_days": 7,
      "payload_hash": "6ddc498cec79e577e88b2720faeb24b910b8cf896c83ef87344933dd78ba25a7",
      "quotes_count": 35
    }
  ]
}
```

---

### `GET /audit/{route}`
Returns individual ticket quotes for a route, including their audit lineage, cryptographic SHA-256 hash, and outlier status.

#### Path & Query Parameters
| Parameter | Type | In | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `string` | Path | **Yes** | Route code, e.g. `DEL-BOM` |
| `only_outliers` | `boolean` | Query | No | If `true`, returns ONLY flagged outliers (default `false`) |
| `limit` | `integer` | Query | No | Number of observations to return (default `100`, max `1000`) |

#### Response Example
```json
{
  "route": "DEL-BOM",
  "sample_count": 100,
  "outlier_count": 6,
  "observations": [
    {
      "clean_fare_id": 973,
      "route": "DEL-BOM",
      "travel_date": "2026-09-04",
      "horizon_days": 7,
      "airline": "IndiGo",
      "flight_number": "6E",
      "base_fare": 7270.9,
      "tax": 1283.1,
      "tax_estimated": true,
      "total_price": 8554.0,
      "ancillary_fees_dropped": 0.0,
      "is_outlier": false,
      "outlier_reason": null,
      "outlier_score": null,
      "cleaned_at": "2026-08-28T17:40:09.123456",
      "lineage": {
        "source_raw_fare_id": 31,
        "scrape_timestamp": "2026-08-28T17:40:08.423880",
        "source_engine": "google_flights",
        "sha256_payload_hash": "6ddc498cec79e577e88b2720faeb24b910b8cf896c83ef87344933dd78ba25a7"
      }
    },
    {
      "clean_fare_id": 1869,
      "route": "DEL-BOM",
      "travel_date": "2026-09-15",
      "horizon_days": 7,
      "airline": "FakeAir",
      "flight_number": "FK-9999",
      "base_fare": 42500.0,
      "tax": 7500.0,
      "tax_estimated": true,
      "total_price": 50000.0,
      "ancillary_fees_dropped": 0.0,
      "is_outlier": true,
      "outlier_reason": "Z-score 13.36 > 3.0 std dev (mean: 6975.63, std: 3220.51)",
      "outlier_score": 13.3595,
      "cleaned_at": "2026-08-28T17:47:21.939759",
      "lineage": {
        "source_raw_fare_id": null,
        "scrape_timestamp": null,
        "source_engine": null,
        "sha256_payload_hash": null
      }
    }
  ]
}
```

---

## 4. MoSPI / NSO Statistical Export

### `GET /export`
Downloads or returns the official COICOP `07.3.3.1` Consumer Price Sub-Index dataset.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `format` | `string` | No | `json` (default) or `csv` (triggers direct file download) |
| `method` | `string` | No | Filter by method: `Dutot`, `Jevons`, or `DGCA_Weighted_Dutot` |

#### JSON Response Example (`format=json`)
```json
{
  "dataset_name": "MoSPI Domestic Airfare Consumer Price Sub-Index",
  "ministry": "Ministry of Statistics and Programme Implementation",
  "coicop_item_code": "07.3.3.1",
  "total_records": 13,
  "data": [
    {
      "id": 1,
      "date": "2026-08-28",
      "route": "BLR-DEL",
      "method": "Dutot",
      "index_value": 100.0,
      "base_period": "2026-08-28",
      "base_period_is_real_data": true,
      "sample_size": 420,
      "metadata": {
        "current_mean_price": 9594.49,
        "base_reference_price": 9594.49,
        "min_price": 8554.0,
        "max_price": 13650.0,
        "base_period_is_real_data": true,
        "base_period_date": "2026-08-28"
      },
      "created_at": "2026-08-28T17:56:55.804800"
    }
  ]
}
```

#### CSV Response Example (`format=csv`)
Content-Type: `text/csv`, Filename: `mospi_airfare_index_series.csv`
```csv
index_id,period_date,coicop_classification,commodity_description,route_code,aggregation_formula,base_period,base_period_is_real_data,index_value,observation_sample_size,created_at
1,2026-08-28,07.3.3.1,Passenger Transport by Air - Domestic Scheduled,BLR-DEL,Dutot,2026-08-28,True,100.0000,420,2026-08-28T17:56:55.804800
```

---

## 5. Known Limitations & Data Notes

1. **Initial Baseline ($100.00$)**:
   - The base period ($P_0$) is automatically fixed to the **first day of live data collection** (`2026-08-28`).
   - Consequently, all index values on Day 1 will read exactly `100.00`. As subsequent daily scrapes execute, the index will trend above or below 100 based on true market price movements.
   - `base_period_is_real_data: true` confirms this baseline is empirical, not a fabricated estimate.

2. **Tax & Base Fare Decomposition**:
   - Google Flights returns only `total_price`.
   - The `base_fare` (85%) and statutory `tax` (15%) fields are estimated breakdowns for visual/informational decomposition and are explicitly tagged with `"tax_estimated": true`.
   - The index calculations (Dutot and Jevons) are computed on true **`total_price`**, ensuring mathematical accuracy.

3. **Current Sector Coverage**:
   - Monitored routes (6 major sectors): `DEL-BOM`, `BLR-DEL`, `HYD-MAA`, `DEL-MAA`, `BOM-BLR`, `DEL-CCU`.
   - Monitored booking horizons (5 advance purchase windows): `T+1`, `T+7`, `T+15`, `T+30`, `T+45` days.
