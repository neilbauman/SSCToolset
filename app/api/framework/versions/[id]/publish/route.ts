import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// Correct typing for route handlers in Next.js 15
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const result = await publishVersion(id);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
