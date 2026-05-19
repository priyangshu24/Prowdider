"use client";

import { useEffect, useState } from "react";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

type DashboardLead = {
  assignmentId: string;
  assignedAt: string;
  leadId: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  description: string;
  serviceName: string;
};

type DashboardProvider = {
  id: number;
  name: string;
  monthlyQuota: number;
  assignedCount: number;
  remainingQuota: number;
  leads: DashboardLead[];
};

type DashboardResponse = {
  activeCycle: { id: string; externalCycleKey: string; startedAt: string } | null;
  providers: DashboardProvider[];
  totals: { totalLeads: number; totalAssignments: number };
};

async function fetchDashboard(): Promise<DashboardResponse> {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load dashboard data.");
  return response.json();
}

export function DashboardClient() {
  const [data, setData]   = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick]   = useState(0);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const snapshot = await fetchDashboard();
        if (!disposed) { setData(snapshot); setError(null); setTick(t => t + 1); }
      } catch (e) {
        if (!disposed) setError(e instanceof Error ? e.message : "Unknown error.");
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), POLLING_INTERVAL_MS);
    return () => { disposed = true; window.clearInterval(interval); };
  }, []);

  if (error) {
    return (
      <div className="panel" style={{ color: "#f87171", fontSize: "14px" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-2)", fontSize: "14px", padding: "32px" }}>
        <span style={{ display: "inline-flex", gap: "4px" }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "var(--accent)", display: "block",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </span>
        Loading live provider data…
        <style>{`
          @keyframes dotPulse {
            0%,80%,100% { opacity:.25; transform:scale(.8); }
            40%          { opacity:1;   transform:scale(1);  }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-stack">
      {/* Stats bar */}
      <div className="stats-grid">
        <article className="stat-card">
          <span className="eyebrow">Active cycle</span>
          <strong style={{ fontSize: "16px", letterSpacing: "-0.3px", marginTop: "8px" }}>
            {data.activeCycle?.externalCycleKey ?? "—"}
          </strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Unique leads</span>
          <strong>{data.totals.totalLeads}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Assignments</span>
          <strong>{data.totals.totalAssignments}</strong>
        </article>
        <article className="stat-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span className="eyebrow">Status</span>
            <strong style={{ fontSize: "13px", color: "#34d399", marginTop: "6px", letterSpacing: "0" }}>Live</strong>
          </div>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#10b981", boxShadow: "0 0 8px #10b981",
            animation: "livePulse 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <style>{`
            @keyframes livePulse {
              0%,100% { opacity:1; box-shadow:0 0 8px #10b981; }
              50%      { opacity:.5; box-shadow:0 0 0 #10b981; }
            }
          `}</style>
        </article>
      </div>

      {/* Provider cards */}
      <div className="provider-grid">
        {data.providers.map((provider) => (
          <article key={provider.id} className="provider-card">
            <div className="provider-heading">
              <div>
                <span className="eyebrow">Provider {provider.id}</span>
                <h2>{provider.name}</h2>
              </div>
              <span className={`quota-pill${provider.remainingQuota === 0 ? " quota-empty" : ""}`}>
                {provider.remainingQuota} left
              </span>
            </div>

            <div className="provider-metrics">
              <div>
                <span className="metric-label">Assigned</span>
                <strong>{provider.assignedCount}</strong>
              </div>
              <div>
                <span className="metric-label">Monthly quota</span>
                <strong>{provider.monthlyQuota}</strong>
              </div>
              <div>
                <span className="metric-label">Fill rate</span>
                <strong style={{ fontSize: "18px" }}>
                  {provider.monthlyQuota > 0
                    ? `${Math.round((provider.assignedCount / provider.monthlyQuota) * 100)}%`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="lead-list">
              {provider.leads.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "16px 0", fontSize: "13px" }}>
                  No leads assigned in the current cycle.
                </p>
              ) : (
                provider.leads.map((lead) => (
                  <div key={lead.assignmentId} className="lead-row">
                    <strong>{lead.customerName}</strong>
                    <p>{lead.serviceName} · {lead.city} · {lead.phoneNumber}</p>
                    <p style={{ color: "var(--muted)", marginTop: "2px" }}>{lead.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
