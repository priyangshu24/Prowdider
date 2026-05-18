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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Unexpected request failure.");
  }

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
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unexpected error.",
      });
    }
  }

  return (
    <div className="tool-grid">
      <article className="panel">
        <div className="panel-header">
          <span className="eyebrow">Webhook simulation</span>
          <h2>Quota reset tools</h2>
        </div>
        <div className="button-stack">
          <button
            className="primary-button"
            onClick={() =>
              runAction("Resetting quota", async () => {
                const eventId = `subscription-renewed-${Date.now()}`;
                const data = await postJson("/api/webhooks/subscription-renewed", { eventId });
                return data.alreadyProcessed
                  ? "Webhook was already processed."
                  : "Provider quotas were reset to a fresh cycle of 10.";
              })
            }
          >
            Reset provider quota to 10
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              runAction("Testing idempotency", async () => {
                const eventId = `idempotency-check-${Date.now()}`;
                const calls = await Promise.all(
                  Array.from({ length: 4 }, () =>
                    postJson("/api/webhooks/subscription-renewed", { eventId }),
                  ),
                );
                const processedCount = calls.filter((call) => call.alreadyProcessed === false).length;
                return `Processed once and ignored ${calls.length - processedCount} duplicate deliveries.`;
              })
            }
          >
            Call webhook multiple times
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <span className="eyebrow">Concurrency pressure</span>
          <h2>Load generator</h2>
        </div>
        <div className="button-stack">
          <button
            className="primary-button"
            onClick={() =>
              runAction("Generating leads", async () => {
                const data = await postJson("/api/test-tools/generate-leads", { count: 10 });
                return `Created ${data.createdCount} leads in parallel across ${data.servicesTouched.join(", ")}.`;
              })
            }
          >
            Generate 10 leads instantly
          </button>
        </div>
      </article>

      {state.status === "working" && <p className="muted">{state.label}...</p>}
      {state.status === "done" && <p className="success-text">{state.message}</p>}
      {state.status === "error" && <p className="error-text">{state.message}</p>}
    </div>
  );
}
