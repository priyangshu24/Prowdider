import { NextResponse } from "next/server";
import { AllocationError, DuplicateLeadError } from "@/lib/errors";

export const dynamic = "force-dynamic";
import { createLeadWithAssignments, type AllocatedLead } from "@/lib/lead-allocation";
import { createLeadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createLeadSchema.parse(body);
    const lead = await createLeadWithAssignments(input);

    return NextResponse.json(
      {
        lead: {
          id: lead.id,
          service: lead.service.name,
          providers: lead.assignments.map((assignment: AllocatedLead['assignments'][number]) => assignment.provider.name),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateLeadError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof AllocationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
