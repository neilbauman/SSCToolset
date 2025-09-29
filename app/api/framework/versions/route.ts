// app/api/framework/versions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listVersions, createVersion } from "@/lib/services/framework";

/**
 * GET /api/framework/versions
 * Returns list of all framework versions.
 */
export async function GET(_req: NextRequest) {
  try {
    const versions = await listVersions();
    return NextResponse.json(versions);
  } catch (err: any) {
    console.error("GET /framework/versions error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/framework/versions
 * Body: { name: string }
 * Creates a new draft version.
 */
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const version = await createVersion(name);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("POST /framework/versions error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
