import { NextResponse } from "next/server";
import { listVersions } from "@/lib/services/framework";

export async function GET(_req: Request) {
  try {
    const versions = await listVersions();
    return NextResponse.json(versions);
  } catch (err: any) {
    console.error("GET /api/framework/versions", err);
    return NextResponse.json({ error: err?.message ?? "Failed to load versions" }, { status: 500 });
  }
}
