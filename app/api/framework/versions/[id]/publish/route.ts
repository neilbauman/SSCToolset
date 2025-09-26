import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

export async function POST(request: Request, context: any) {
  try {
    const id = context.params.id as string;
    await publishVersion(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
