import { NextResponse } from "next/server";
import { processQuotaResetWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventId = typeof body.eventId === "string" ? body.eventId : "";

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required." }, { status: 400 });
    }

    const result = await processQuotaResetWebhook(eventId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
