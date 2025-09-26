import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    await publishVersion(context.params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
