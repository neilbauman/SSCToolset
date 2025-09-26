// app/api/framework/versions/[id]/items/route.ts
import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

// GET /api/framework/versions/:id/items
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getVersionTree(params.id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
