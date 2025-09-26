import { NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    const result = await publishVersion(id);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
