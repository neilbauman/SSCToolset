import { NextRequest, NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const data = await getVersionTree(params.id);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
