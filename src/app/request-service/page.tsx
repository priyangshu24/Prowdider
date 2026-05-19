import { RequestServiceForm } from "@/app/request-service/request-service-form";

export default function RequestServicePage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Public route</span>
        <h1>Request a service</h1>
        <p>
          Every submission is persisted, duplicate phone + service combinations are blocked at the
          database level, and providers are allocated the moment a lead is created.
        </p>
      </div>
      <RequestServiceForm />
    </section>
  );
}
