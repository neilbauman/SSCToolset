// app/api/framework/versions/[id]/items/route.ts
import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

// GET /api/framework/versions/:id/items
export async function GET(_request: Request, context: any) {
  try {
    const id = context?.params?.id as string;
    if (!id) throw new Error("Missing version id");
    const data = await getVersionTree(id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
