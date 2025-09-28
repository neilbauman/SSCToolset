import { NextResponse } from "next/server";
import { listVersions, createVersion } from "@/lib/services/framework";

/** GET /api/framework/versions
 *  Returns list of framework versions.
 */
export async function GET() {
  try {
    const versions = await listVersions();
    return NextResponse.json({ data: versions });
  } catch (e: any) {
    console.error("GET /api/framework/versions failed", e);
    return NextResponse.json({ error: e?.message ?? "Failed to load versions" }, { status: 500 });
  }
}

/** POST /api/framework/versions
 *  Body: { name: string }
 *  Creates a new draft version.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const version = await createVersion(name);
    return NextResponse.json({ data: version });
  } catch (e: any) {
    console.error("POST /api/framework/versions failed", e);
    return NextResponse.json({ error: e?.message ?? "Failed to create version" }, { status: 500 });
  }
}
