import Link from "next/link";

export default function Home() {
  return (
    <section className="page-shell home-shell">
      <div className="hero-card">
        <span className="eyebrow">Full-stack assignment</span>
        <h1>Mini lead distribution system with persistent fairness and quota-safe routing.</h1>
        <p>
          Designed around correctness: database-enforced duplicates, transactional lead allocation,
          persistent round-robin state, idempotent quota resets, and a live provider dashboard.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "32px", position: "relative" }}>
          <Link href="/request-service" className="primary-button">
            Request Service
          </Link>
          <Link href="/dashboard" className="secondary-button">
            View Dashboard
          </Link>
        </div>
      </div>

      <div className="feature-grid">
        <article className="panel">
          <span className="eyebrow">01</span>
          <h2>Customer form</h2>
          <p>Capture enquiries on <code style={{fontSize:"12px",color:"var(--accent)",background:"rgba(249,115,22,0.08)",padding:"1px 5px",borderRadius:"4px"}}>/request-service</code> and assign providers immediately.</p>
        </article>
        <article className="panel">
          <span className="eyebrow">02</span>
          <h2>Fair allocation</h2>
          <p>Mandatory rules are applied first, then remaining slots rotate using DB-backed cursors.</p>
        </article>
        <article className="panel">
          <span className="eyebrow">03</span>
          <h2>Provider visibility</h2>
          <p>The dashboard shows quota, assignment totals, and live leads without full page refreshes.</p>
        </article>
        <article className="panel">
          <span className="eyebrow">04</span>
          <h2>Operational tests</h2>
          <p><code style={{fontSize:"12px",color:"var(--accent)",background:"rgba(249,115,22,0.08)",padding:"1px 5px",borderRadius:"4px"}}>/test-tools</code> verifies quota resets, webhook idempotency, and concurrency behavior.</p>
        </article>
      </div>
    </section>
  );
}
