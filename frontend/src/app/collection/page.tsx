"use client";

import React, { useEffect, useState } from "react";
import { Server, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { getSourcesHealth, getScrapeRuns } from "@/lib/api";
import { SourcesHealthResponse, ScrapeRunsResponse } from "@/types/api";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

export default function CollectionPage() {
  const [sourcesHealth, setSourcesHealth] = useState<SourcesHealthResponse | null>(null);
  const [scrapeRuns, setScrapeRuns] = useState<ScrapeRunsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => ({ ...prev, [runId]: !prev[runId] }));
  };

  const fetchCollectionData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [health, runs] = await Promise.all([
        getSourcesHealth(),
        getScrapeRuns(40)
      ]);
      setSourcesHealth(health);
      setScrapeRuns(runs);
    } catch (err: any) {
      setError(err.message || "Failed to load collection data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionData();
  }, []);

  const sources = sourcesHealth?.sources || [];
  const runs = scrapeRuns?.runs || [];

  const filteredRuns = statusFilter === "ALL" ? runs : runs.filter((r) => r.status === statusFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
      case "SUCCESS":
        return "app-badge-teal";
      case "DEGRADED":
      case "PARTIAL":
        return "app-badge-gold";
      case "UNAVAILABLE":
      case "FAILED":
        return "app-badge-rose";
      default:
        return "app-bg-surface app-text-secondary border app-border";
    }
  };

  return (
    <div className="space-y-8 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b app-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight app-text-primary flex items-center gap-2">
            <Server className="w-6 h-6 text-[var(--color-rose)]" />
            Collection Engine & Source Health
          </h1>
          <p className="text-xs app-text-secondary mt-1">
            Real-time status of multi-source scrapers, response latencies, and execution run logs.
          </p>
        </div>

        <button
          onClick={fetchCollectionData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 app-bg-card hover:app-bg-card-hover border app-border text-xs font-semibold app-text-primary rounded-md transition-colors shadow-sm self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Health Status
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Querying scraper telemetry and execution run logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCollectionData} />
      ) : (
        <>
          {/* Source Status Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold app-text-secondary uppercase tracking-wider">
              Scraper Adapter Telemetry
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sources.map((source, idx) => (
                <div
                  key={source.source_name}
                  className={`app-card-blue-${(idx % 3) + 1} rounded-xl p-5 shadow-sm space-y-3 transition-transform hover:-translate-y-0.5`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1E2A44]">
                      {source.source_name.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(source.health.status)}`}>
                      {source.health.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-[#7D8CA3] block">Query Latency</span>
                      <span className="font-bold text-[#1E2A44]">
                        {source.health.last_response_time_ms ? `${source.health.last_response_time_ms} ms` : "Instant (Live)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7D8CA3] block">Total Quotes Harvested</span>
                      <span className="font-bold text-[#111827]">{source.health.total_quotes_collected}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7D8CA3] pt-2 border-t border-[#CBDCEE] leading-relaxed">
                    Priority #{source.priority} • User-Agent: AirIndexIndiaBot/1.0
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ScrapeRun Execution Logs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold app-text-primary">
                ScrapeRun Execution History ({filteredRuns.length} Runs)
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "ALL"
                      ? "bg-[#1E2A44] text-[#F5F3EC] shadow-sm font-bold border border-[#111827]"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("SUCCESS")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "SUCCESS"
                      ? "bg-[#1E2A44] text-[#F5F3EC] shadow-sm font-bold border border-[#111827]"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  Success
                </button>
                <button
                  onClick={() => setStatusFilter("FAILED")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "FAILED"
                      ? "bg-[#1E2A44] text-[#F5F3EC] shadow-sm font-bold border border-[#111827]"
                      : "app-bg-surface app-text-secondary hover:app-text-primary"
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>            {/* Desktop Table View (Full Columns, Clean, No Chevrons) */}
            <div className="hidden md:block app-bg-card border app-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="app-bg-surface border-b app-border text-[11px] font-semibold app-text-secondary uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Run ID</th>
                    <th className="px-5 py-3.5">Execution Time</th>
                    <th className="px-5 py-3.5">Source Adapter</th>
                    <th className="px-5 py-3.5">Quotes Collected</th>
                    <th className="px-5 py-3.5">Duration</th>
                    <th className="px-5 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y app-border-subtle app-text-primary font-mono">
                  {filteredRuns.map((run) => (
                    <tr key={run.run_id} className="hover:app-bg-surface/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold app-text-primary">
                        {run.run_id}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] app-text-muted">
                        {run.started_at ? new Date(run.started_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-5 py-3.5 font-sans app-text-secondary">
                        {run.source || "Google Flights"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-gold)] font-bold">
                        {run.records_collected} quotes
                      </td>
                      <td className="px-5 py-3.5 text-[11px] app-text-secondary">
                        {run.duration_seconds ? `${run.duration_seconds.toFixed(1)}s` : "0.5s"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded border inline-block ${getStatusBadge(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Expandable Table View (Zero-Scroll with Click-to-Expand) */}
            <div className="md:hidden app-bg-card border app-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="app-bg-surface border-b app-border text-[11px] font-semibold app-text-secondary uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3">Run ID</th>
                    <th className="px-2 py-3 text-center">Quotes</th>
                    <th className="px-3 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y app-border-subtle app-text-primary font-mono">
                  {filteredRuns.map((run) => {
                    const isExpanded = !!expandedRuns[run.run_id];
                    return (
                      <React.Fragment key={run.run_id}>
                        <tr
                          onClick={() => toggleRun(run.run_id)}
                          className="hover:app-bg-surface/70 transition-colors cursor-pointer select-none"
                        >
                          <td className="px-3 py-3 font-bold app-text-primary">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-gold)] flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 app-text-muted flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[130px]">
                                {run.run_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center text-[var(--color-gold)] font-bold">
                            {run.records_collected}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block ${getStatusBadge(
                                run.status
                              )}`}
                            >
                              {run.status}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Details Sub-row */}
                        {isExpanded && (
                          <tr className="app-bg-surface/60 border-t border-b app-border-subtle">
                            <td colSpan={3} className="px-3.5 py-3 text-xs">
                              <div className="grid grid-cols-2 gap-2.5 font-mono">
                                <div>
                                  <span className="text-[9px] uppercase font-semibold app-text-muted block">
                                    Execution Time
                                  </span>
                                  <span className="text-[11px] app-text-primary">
                                    {run.started_at ? new Date(run.started_at).toLocaleString() : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-semibold app-text-muted block">
                                    Duration
                                  </span>
                                  <span className="text-[11px] app-text-primary">
                                    {run.duration_seconds ? `${run.duration_seconds.toFixed(1)}s` : "0.5s"}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-[9px] uppercase font-semibold app-text-muted block">
                                    Source Adapter
                                  </span>
                                  <span className="text-[11px] app-text-primary font-sans">
                                    {run.source || "Google Flights API Adapter"}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
