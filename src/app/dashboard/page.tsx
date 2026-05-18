import { DashboardClient } from "@/app/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Provider operations</span>
        <h1>Live dashboard</h1>
        <p>
          The dashboard reads from the database and refreshes automatically every few seconds, so
          new allocations appear without a manual page reload.
        </p>
      </div>
      <DashboardClient />
    </section>
  );
}
