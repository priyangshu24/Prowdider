import { TestToolsPanel } from "@/app/test-tools/test-tools-panel";

export default function TestToolsPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Operational testing</span>
        <h1>Test tools</h1>
        <p>
          Simulate the payment webhook, verify idempotency, and generate concurrent leads without
          touching the normal customer flow.
        </p>
      </div>
      <TestToolsPanel />
    </section>
  );
}
