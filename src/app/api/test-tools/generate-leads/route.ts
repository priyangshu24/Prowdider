import { NextResponse } from "next/server";
import { createLeadWithAssignments } from "@/lib/lead-allocation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = typeof body.count === "number" ? Math.max(1, Math.min(body.count, 25)) : 10;
    const timestamp = Date.now();
    const servicesTouched = new Set<string>();

    const results = await Promise.all(
      Array.from({ length: count }, (_, index) => {
        const serviceId = (index % 3) + 1;
        servicesTouched.add(`Service ${serviceId}`);

        return createLeadWithAssignments({
          name: `Load Test Customer ${timestamp}-${index}`,
          phoneNumber: `9000${String(timestamp).slice(-6)}${index}`,
          city: `City ${index + 1}`,
          serviceId,
          description: `Concurrent test lead ${index + 1} for service ${serviceId}.`,
        });
      }),
    );

    return NextResponse.json({
      createdCount: results.length,
      servicesTouched: [...servicesTouched],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Bulk lead generation failed." }, { status: 500 });
  }
}
