import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/dashboard";

export async function GET() {
  try {
    const snapshot = await getDashboardSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load dashboard data." }, { status: 500 });
  }
}
