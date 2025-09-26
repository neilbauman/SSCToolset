import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tree = await getVersionTree(params.id);
    return NextResponse.json(tree);
  } catch (err: any) {
    console.error(`GET /api/framework/versions/${params.id}/tree`, err);
    return NextResponse.json({ error: err?.message ?? "Failed to load tree" }, { status: 500 });
  }
}
