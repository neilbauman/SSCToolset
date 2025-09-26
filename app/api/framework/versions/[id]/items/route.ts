import { NextRequest, NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

export async function GET(_req: NextRequest, context: any) {
  try {
    const { id } = context.params;
    const data = await getVersionTree(id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
