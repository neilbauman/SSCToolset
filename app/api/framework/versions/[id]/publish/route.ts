import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const version = await publishVersion(params.id);
    return NextResponse.json({ data: version });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
