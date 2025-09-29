// app/api/framework/versions/route.ts
import { NextResponse } from "next/server";
import { listVersions, createVersion } from "@/lib/services/framework";

// GET all versions
export async function GET() {
  try {
    const versions = await listVersions();
    return NextResponse.json(versions);
  } catch (err: any) {
    console.error("GET /framework/versions error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create new version from scratch
export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const version = await createVersion(name, description ?? "");
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("POST /framework/versions error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
