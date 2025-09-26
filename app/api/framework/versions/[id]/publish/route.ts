import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// Next.js 15 route handlers: second arg must be typed properly
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // params is now async in Next 15
    const result = await publishVersion(id);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
