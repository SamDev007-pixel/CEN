"use client";

import { useEffect, useState } from "react";
import { getRouteAudit } from "@/lib/api";
import { RouteAuditResponse, CleanObservation } from "@/types/api";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import AirlineLogo from "@/components/ui/AirlineLogo";

const CONFIGURED_ROUTES = [
  "DEL-BOM",
  "BLR-DEL",
  "DEL-CCU",
  "BOM-BLR",
  "DEL-MAA",
  "HYD-MAA",
];

export default function AuditPage() {
  const [selectedRoute, setSelectedRoute] = useState<string>("DEL-BOM");
  const [auditData, setAuditData] = useState<RouteAuditResponse | null>(null);
  const [selectedObs, setSelectedObs] = useState<CleanObservation | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRouteAudit = async (route: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getRouteAudit(route);
      setAuditData(res);
      if (res.observations.length > 0) {
        setSelectedObs(res.observations[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit trail.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteAudit(selectedRoute);
  }, [selectedRoute]);

  const observations = auditData?.observations || [];
  const filteredObs =
    filterType === "ALL"
      ? observations
      : filterType === "OUTLIERS"
      ? observations.filter((o) => o.is_outlier)
      : observations.filter((o) => !o.is_outlier);

  return (
    <div className="space-y-8 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 transition-colors duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b app-border">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight app-text-primary">
              Data Lineage & Cryptographic Audit
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md app-badge-rose whitespace-nowrap">
              SHA-256 Provenance
            </span>
          </div>
          <p className="text-xs app-text-secondary mt-1">
            5-stage data lineage verification: from raw multi-source harvest payload to clean index observation.
          </p>
        </div>

        {/* Route Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="app-bg-card border app-border app-text-primary rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none shadow-sm"
          >
            {CONFIGURED_ROUTES.map((r) => (
              <option key={r} value={r} className="app-bg-card app-text-primary">
                {r} Corridor
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5-Stage Lineage Visualizer */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold app-text-secondary uppercase tracking-wider">
          5-Stage Ingestion & Processing Pipeline
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="app-bg-card border app-border rounded-lg p-3 shadow-sm space-y-1">
            <div className="font-bold app-text-primary">1. Scrape Harvest</div>
            <p className="text-[10px] app-text-muted">Multi-source JSON payload ingestion with polite bot headers.</p>
          </div>
          <div className="app-bg-card border app-border rounded-lg p-3 shadow-sm space-y-1">
            <div className="font-bold text-[var(--color-rose)]">2. SHA-256 Hash</div>
            <p className="text-[10px] app-text-muted">Cryptographic fingerprint stored in raw_fares table.</p>
          </div>
          <div className="app-bg-card border app-border rounded-lg p-3 shadow-sm space-y-1">
            <div className="font-bold app-text-primary">3. Ingestion Check</div>
            <p className="text-[10px] app-text-muted">Drops ₹0 quotes, circular routes, and malformed structures.</p>
          </div>
          <div className="app-bg-card border app-border rounded-lg p-3 shadow-sm space-y-1">
            <div className="font-bold text-[var(--color-gold)]">4. Outlier Filter</div>
            <p className="text-[10px] app-text-muted">3-Sigma Z-Score + IQR bounding flags non-market artifacts.</p>
          </div>
          <div className="app-bg-card border app-border rounded-lg p-3 shadow-sm space-y-1">
            <div className="font-bold text-[var(--color-teal)]">5. Index Relative</div>
            <p className="text-[10px] app-text-muted">Dutot & Jevons calculation over observed quotes.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message={`Fetching cryptographic quote lineage for ${selectedRoute}...`} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchRouteAudit(selectedRoute)} />
      ) : observations.length === 0 ? (
        <EmptyState title="No Observations Found for Audit" description="Wait for scheduled collection cycle." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Observation Records Table */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold app-text-primary">
                Harvested Quotes ({filteredObs.length})
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === "ALL"
                      ? "bg-[var(--color-gold)] text-white shadow-sm font-semibold"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  All ({observations.length})
                </button>
                <button
                  onClick={() => setFilterType("CLEAN")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === "CLEAN"
                      ? "bg-[var(--color-gold)] text-white shadow-sm font-semibold"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  Clean
                </button>
                <button
                  onClick={() => setFilterType("OUTLIERS")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === "OUTLIERS"
                      ? "bg-[var(--color-gold)] text-white shadow-sm font-semibold"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  Outliers
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block app-bg-card border app-border rounded-xl overflow-hidden shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 app-bg-surface border-b app-border text-[11px] font-semibold app-text-secondary uppercase tracking-wider shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-[var(--bg-surface)]">Carrier</th>
                    <th className="px-4 py-3 bg-[var(--bg-surface)]">Horizon</th>
                    <th className="px-4 py-3 bg-[var(--bg-surface)]">Total Fare</th>
                    <th className="px-4 py-3 bg-[var(--bg-surface)]">Provenance</th>
                    <th className="px-4 py-3 bg-[var(--bg-surface)] text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y app-border-subtle app-text-primary font-mono">
                  {filteredObs.map((obs) => {
                    const isSelected = selectedObs?.clean_fare_id === obs.clean_fare_id;
                    return (
                      <tr
                        key={obs.clean_fare_id}
                        onClick={() => setSelectedObs(obs)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "app-bg-surface border-l-4 border-[var(--color-gold)]" : "hover:app-bg-surface/70"
                        }`}
                      >
                        <td className="px-4 py-3 font-sans font-bold app-text-primary">
                          <div className="flex items-center gap-2.5">
                            <AirlineLogo airline={obs.airline} size="sm" />
                            <span className="truncate">{obs.airline || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">T+{obs.horizon_days}</td>
                        <td className="px-4 py-3 font-bold text-[var(--color-gold)]">
                          ₹{Math.round(obs.total_price).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="app-badge-teal text-[10px] px-1.5 py-0.5 rounded">
                            {obs.observation_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {obs.is_outlier ? (
                            <span className="app-badge-rose text-[10px] px-1.5 py-0.5 rounded">
                              Outlier
                            </span>
                          ) : (
                            <span className="app-badge-teal text-[10px] px-1.5 py-0.5 rounded">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (Zero Horizontal Scrolling) */}
            <div className="md:hidden space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-0.5">
              {filteredObs.map((obs) => {
                const isSelected = selectedObs?.clean_fare_id === obs.clean_fare_id;
                return (
                  <div
                    key={obs.clean_fare_id}
                    onClick={() => setSelectedObs(obs)}
                    className={`app-bg-card border rounded-xl p-3.5 shadow-sm space-y-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]"
                        : "app-border hover:border-slate-400 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AirlineLogo airline={obs.airline} size="sm" />
                        <span className="font-bold text-xs app-text-primary truncate">
                          {obs.airline || "Unknown"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-[var(--color-gold)] flex-shrink-0">
                        ₹{Math.round(obs.total_price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono app-text-muted pt-1 border-t app-border-subtle">
                      <span>Horizon: <strong className="app-text-primary">T+{obs.horizon_days}</strong></span>
                      <div className="flex items-center gap-1.5">
                        <span className="app-badge-teal text-[9px] px-1.5 py-0.5 rounded font-bold">
                          {obs.observation_type}
                        </span>
                        {obs.is_outlier ? (
                          <span className="app-badge-rose text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Outlier
                          </span>
                        ) : (
                          <span className="app-badge-teal text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Valid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic Inspector Sidebar */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold app-text-primary">
              Cryptographic Provenance
            </h2>

            {selectedObs ? (
              <div className="app-bg-card border app-border rounded-lg p-5 shadow-sm space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold app-text-muted uppercase">Quote Identifier</span>
                  <p className="font-mono font-bold app-text-primary pt-0.5">#{selectedObs.clean_fare_id} • {selectedObs.route}</p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold app-text-muted uppercase">Linked Raw Scrape ID</span>
                  <p className="font-mono font-bold text-[var(--color-gold)] pt-0.5">raw_fare_id: {selectedObs.lineage?.source_raw_fare_id ?? "N/A"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold app-text-muted uppercase">SHA-256 Fingerprint</span>
                  <div className="app-bg-surface p-2.5 rounded-md border app-border mt-1 font-mono text-[10px] break-all app-text-secondary">
                    {selectedObs.lineage?.sha256_payload_hash || "SHA-256 provenance linked via raw_fare_id"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t app-border-subtle">
                  <div>
                    <span className="text-[10px] app-text-muted block">Outlier Score</span>
                    <span className="font-mono font-bold text-[var(--color-rose)]">
                      {selectedObs.outlier_score ? selectedObs.outlier_score.toFixed(3) : "0.000"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] app-text-muted block">Decomposition</span>
                    <span className="font-mono font-semibold app-badge-gold px-1.5 py-0.5 rounded text-[10px]">
                      {selectedObs.fare_decomposition_status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="app-bg-surface border app-border rounded-lg p-6 text-center text-xs app-text-muted">
                Select a quote from the table to inspect cryptographic payload hashes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
