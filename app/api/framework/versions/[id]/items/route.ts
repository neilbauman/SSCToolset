import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

export async function GET(request: Request, context: any) {
  try {
    const id = context.params.id as string;
    const data = await getVersionTree(id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
