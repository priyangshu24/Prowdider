import { TestToolsPanel } from "@/app/test-tools/test-tools-panel";

export default function TestToolsPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Operational testing</span>
        <h1>Test tools</h1>
        <p>
          These controls simulate the payment webhook, verify idempotency, and create concurrent
          leads without exposing quota reset behavior in the normal customer flow.
        </p>
      </div>
      <TestToolsPanel />
    </section>
  );
}
