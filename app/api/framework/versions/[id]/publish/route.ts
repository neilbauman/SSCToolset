// app/api/framework/versions/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// POST /api/framework/versions/:id/publish
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await publishVersion(params.id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
