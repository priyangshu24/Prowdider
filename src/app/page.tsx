export default function Home() {
  return (
    <section className="page-shell home-shell">
      <div className="hero-card">
        <span className="eyebrow">Full-stack assignment</span>
        <h1>Mini lead distribution system with persistent fairness and quota-safe routing.</h1>
        <p>
          This implementation is intentionally designed around correctness: database-enforced
          duplicates, transactional lead allocation, persistent round-robin state, idempotent quota
          resets, and a live provider dashboard.
        </p>
      </div>

      <div className="feature-grid">
        <article className="panel">
          <span className="eyebrow">01</span>
          <h2>Customer form</h2>
          <p>Capture enquiries on `/request-service` and assign providers immediately.</p>
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
          <p>`/test-tools` verifies quota resets, webhook idempotency, and concurrency behavior.</p>
        </article>
      </div>
    </section>
  );
}
