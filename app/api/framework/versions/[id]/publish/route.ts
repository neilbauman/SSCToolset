// app/api/framework/versions/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// POST /api/framework/versions/:id/publish
export async function POST(_request: Request, context: any) {
  try {
    const id = context?.params?.id as string;
    if (!id) throw new Error("Missing version id");
    const data = await publishVersion(id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
