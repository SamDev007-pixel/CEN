import {
  LatestIndexResponse,
  RouteIndexHistoryResponse,
  AuditSummaryResponse,
  SourcesHealthResponse,
  ScrapeRunsResponse,
  RouteAuditResponse,
  BacktestResponse,
  ValidationCoverageResponse,
  RouteValidationResponse
} from "../types/api";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Accept": "application/json",
        ...options?.headers,
      },
      next: { revalidate: 30 } // ISR / Cache revalidation 30s
    });

    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${res.statusText} for ${endpoint}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`Failed to fetch ${url}:`, err);
    throw err;
  }
}

// -------------------------------------------------------------
// 1. Index APIs
// -------------------------------------------------------------
export async function getLatestIndices(
  method: string = "Dutot",
  frequency: string = "DAILY",
  observation_type: string = "OBSERVED"
): Promise<LatestIndexResponse> {
  return fetchAPI<LatestIndexResponse>(
    `/index/?method=${encodeURIComponent(method)}&frequency=${encodeURIComponent(frequency)}&observation_type=${encodeURIComponent(observation_type)}`
  );
}

export async function getRouteIndexHistory(
  route: string,
  method: string = "Dutot"
): Promise<RouteIndexHistoryResponse> {
  return fetchAPI<RouteIndexHistoryResponse>(
    `/index/${encodeURIComponent(route)}?method=${encodeURIComponent(method)}`
  );
}

// -------------------------------------------------------------
// 2. Audit & Data Lineage APIs
// -------------------------------------------------------------
export async function getAuditSummary(): Promise<AuditSummaryResponse> {
  return fetchAPI<AuditSummaryResponse>("/audit/");
}

export async function getRouteAudit(route: string): Promise<RouteAuditResponse> {
  return fetchAPI<RouteAuditResponse>(`/audit/${encodeURIComponent(route)}`);
}

export async function getSourcesHealth(): Promise<SourcesHealthResponse> {
  return fetchAPI<SourcesHealthResponse>("/audit/sources/health");
}

export async function getScrapeRuns(limit: number = 30): Promise<ScrapeRunsResponse> {
  return fetchAPI<ScrapeRunsResponse>(`/audit/runs?limit=${limit}`);
}

// -------------------------------------------------------------
// 3. Validation & Historical Backtesting APIs
// -------------------------------------------------------------
export async function getBacktest(
  startDate: string = "2026-08-30",
  endDate: string = "2026-10-13",
  method: string = "Dutot",
  referenceSource: string = "SAMPLE_BENCHMARK"
): Promise<BacktestResponse> {
  return fetchAPI<BacktestResponse>(
    `/validation/backtest?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&method=${encodeURIComponent(method)}&reference_source=${encodeURIComponent(referenceSource)}`
  );
}

export async function getValidationCoverage(
  startDate: string = "2026-08-30",
  endDate: string = "2026-10-13"
): Promise<ValidationCoverageResponse> {
  return fetchAPI<ValidationCoverageResponse>(
    `/validation/coverage?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  );
}

export async function getRouteValidation(
  startDate: string = "2026-08-30",
  endDate: string = "2026-10-13",
  referenceSource: string = "SAMPLE_BENCHMARK"
): Promise<RouteValidationResponse> {
  return fetchAPI<RouteValidationResponse>(
    `/validation/routes?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&reference_source=${encodeURIComponent(referenceSource)}`
  );
}

// -------------------------------------------------------------
// 4. Export URL Generator
// -------------------------------------------------------------
export function getExportUrl(format: "csv" | "json" = "csv"): string {
  return `${API_BASE_URL}/export/?format=${format}`;
}
