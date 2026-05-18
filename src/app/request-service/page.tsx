import { RequestServiceForm } from "@/app/request-service/request-service-form";

export default function RequestServicePage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Public route</span>
        <h1>Lead capture</h1>
        <p>
          This form persists every request, blocks duplicate phone plus service submissions, and
          triggers provider allocation immediately after the lead is created.
        </p>
      </div>
      <RequestServiceForm />
    </section>
  );
}
