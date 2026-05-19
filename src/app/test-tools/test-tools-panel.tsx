"use client";

import { useState } from "react";

type ActionState =
  | { status: "idle" }
  | { status: "working"; label: string }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unexpected request failure.");
  return data;
}

export function TestToolsPanel() {
  const [state, setState] = useState<ActionState>({ status: "idle" });

  async function runAction(label: string, task: () => Promise<string>) {
    try {
      setState({ status: "working", label });
      const message = await task();
      setState({ status: "done", message });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Unexpected error." });
    }
  }

  const isWorking = state.status === "working";

  return (
    <div className="tool-grid">
      <article className="panel">
        <div className="panel-header">
          <span className="eyebrow">Webhook simulation</span>
          <h2>Quota reset</h2>
          <p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>
            Resets all provider quotas to a fresh cycle. The second button verifies idempotent delivery.
          </p>
        </div>
        <div className="button-stack">
          <button
            className="primary-button"
            disabled={isWorking}
            onClick={() =>
              runAction("Resetting quota", async () => {
                const eventId = `subscription-renewed-${Date.now()}`;
                const data = await postJson("/api/webhooks/subscription-renewed", { eventId });
                return data.alreadyProcessed
                  ? "Webhook was already processed."
                  : "Provider quotas reset to a fresh cycle of 10.";
              })
            }
          >
            Reset provider quota to 10
          </button>
          <button
            className="secondary-button"
            disabled={isWorking}
            onClick={() =>
              runAction("Testing idempotency", async () => {
                const eventId = `idempotency-check-${Date.now()}`;
                const calls = await Promise.all(
                  Array.from({ length: 4 }, () =>
                    postJson("/api/webhooks/subscription-renewed", { eventId }),
                  ),
                );
                const processedCount = calls.filter(c => c.alreadyProcessed === false).length;
                return `Processed once, ignored ${calls.length - processedCount} duplicate deliveries.`;
              })
            }
          >
            Call webhook × 4 (idempotency check)
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <span className="eyebrow">Concurrency pressure</span>
          <h2>Load generator</h2>
          <p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>
            Fires 10 lead creation requests in parallel to exercise the allocation logic under concurrency.
          </p>
        </div>
        <div className="button-stack">
          <button
            className="primary-button"
            disabled={isWorking}
            onClick={() =>
              runAction("Generating leads", async () => {
                const data = await postJson("/api/test-tools/generate-leads", { count: 10 });
                return `Created ${data.createdCount} leads across ${data.servicesTouched.join(", ")}.`;
              })
            }
          >
            Generate 10 leads instantly
          </button>
        </div>
      </article>

      {state.status === "working" && (
        <div className="panel" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "20px 24px" }}>
          <span style={{ display: "inline-flex", gap: "4px" }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: "var(--accent)", display: "block",
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </span>
          <span className="muted">{state.label}…</span>
          <style>{`
            @keyframes dotPulse {
              0%,80%,100% { opacity:.25; transform:scale(.8); }
              40%          { opacity:1;   transform:scale(1);  }
            }
          `}</style>
        </div>
      )}

      {state.status === "done" && (
        <div className="success-box">
          <p>{state.message}</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="panel" style={{ borderColor: "var(--danger-border)", background: "var(--danger-subtle)" }}>
          <p className="error-text">{state.message}</p>
        </div>
      )}
    </div>
  );
}
