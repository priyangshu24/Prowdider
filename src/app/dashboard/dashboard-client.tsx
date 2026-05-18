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
  activeCycle: {
    id: string;
    externalCycleKey: string;
    startedAt: string;
  } | null;
  providers: DashboardProvider[];
  totals: {
    totalLeads: number;
    totalAssignments: number;
  };
};

async function fetchDashboard() {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load dashboard data.");
  }
  return response.json();
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const snapshot = await fetchDashboard();
        if (!disposed) {
          setData(snapshot);
          setError(null);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "Unknown dashboard error.");
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, POLLING_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!data) {
    return <p className="muted">Loading live provider data...</p>;
  }

  return (
    <div className="dashboard-stack">
      <div className="stats-grid">
        <article className="stat-card">
          <span className="eyebrow">Active cycle</span>
          <strong>{data.activeCycle?.externalCycleKey ?? "Not configured"}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Unique leads</span>
          <strong>{data.totals.totalLeads}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Assignments</span>
          <strong>{data.totals.totalAssignments}</strong>
        </article>
      </div>

      <div className="provider-grid">
        {data.providers.map((provider) => (
          <article key={provider.id} className="panel provider-card">
            <div className="provider-heading">
              <div>
                <span className="eyebrow">Provider {provider.id}</span>
                <h2>{provider.name}</h2>
              </div>
              <span className={`quota-pill ${provider.remainingQuota === 0 ? "quota-empty" : ""}`}>
                {provider.remainingQuota} remaining
              </span>
            </div>

            <div className="provider-metrics">
              <div>
                <span className="metric-label">Assigned this cycle</span>
                <strong>{provider.assignedCount}</strong>
              </div>
              <div>
                <span className="metric-label">Monthly quota</span>
                <strong>{provider.monthlyQuota}</strong>
              </div>
            </div>

            <div className="lead-list">
              {provider.leads.length === 0 ? (
                <p className="muted">No leads assigned in the current cycle.</p>
              ) : (
                provider.leads.map((lead: DashboardLead) => (
                  <div key={lead.assignmentId} className="lead-row">
                    <div>
                      <strong>{lead.customerName}</strong>
                      <p className="muted">
                        {lead.serviceName} · {lead.city} · {lead.phoneNumber}
                      </p>
                    </div>
                    <p>{lead.description}</p>
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
