"use client";

import { FormEvent, useMemo, useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/constants";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | {
      status: "success";
      message: string;
      providers: string[];
    };

export function RequestServiceForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const defaultServiceId = useMemo(() => String(SERVICE_OPTIONS[0].id), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      city: String(formData.get("city") ?? ""),
      serviceId: Number(formData.get("serviceId")),
      description: String(formData.get("description") ?? ""),
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setState({
        status: "error",
        message: data.error ?? "Unable to submit the lead.",
      });
      return;
    }

    if (event.currentTarget) {
      event.currentTarget.reset();
      const serviceField = event.currentTarget.elements.namedItem("serviceId");
      if (serviceField instanceof HTMLSelectElement) {
        serviceField.value = defaultServiceId;
      }
    }

    setState({
      status: "success",
      message: `Lead ${data?.lead?.id} saved and assigned successfully.`,
      providers: data?.lead?.providers ?? [],
    });
  }

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <div className="panel-header">
        <span className="eyebrow">Customer intake</span>
        <h2>Request a service</h2>
        <p className="muted">
          Duplicate phone number plus service combinations are rejected at the database level.
        </p>
      </div>

      <label>
        <span>Name</span>
        <input name="name" type="text" placeholder="Aman Patel" required />
      </label>

      <label>
        <span>Phone Number</span>
        <input name="phoneNumber" type="tel" placeholder="9999999999" required />
      </label>

      <label>
        <span>City</span>
        <input name="city" type="text" placeholder="Bhubaneswar" required />
      </label>

      <label>
        <span>Service Type</span>
        <select name="serviceId" defaultValue={defaultServiceId}>
          {SERVICE_OPTIONS.map((service) => (
            <option key={service.id} value={service.id}>
              {service.label}
            </option>
          ))}
        </select>
      </label>

      <label className="full-width">
        <span>Description</span>
        <textarea
          name="description"
          rows={5}
          placeholder="Describe the service requirement in enough detail for providers."
          required
        />
      </label>

      <button className="primary-button" type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Submitting..." : "Submit lead"}
      </button>

      {state.status === "error" && <p className="error-text">{state.message}</p>}

      {state.status === "success" && (
        <div className="success-box">
          <p>{state.message}</p>
          <p className="muted">Assigned providers: {state.providers.join(", ")}</p>
        </div>
      )}
    </form>
  );
}
