import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const data = await getVersionTree(context.params.id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
