// app/api/framework/versions/route.ts
import { NextResponse } from "next/server";
import {
  listVersions,
  createDraftFromCatalogue,
} from "@/lib/services/framework";

// GET /api/framework/versions
export async function GET() {
  try {
    const data = await listVersions();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// POST /api/framework/versions
// body: { name: string }
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const name =
      typeof json?.name === "string" && json.name.trim().length > 0
        ? json.name.trim()
        : "New Framework Version";

    const version = await createDraftFromCatalogue(name);
    return NextResponse.json({ data: version }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
