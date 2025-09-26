import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

// Avoid strict typing of the 2nd arg in Next 15
export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }
    const tree = await getVersionTree(id);
    return NextResponse.json(tree);
  } catch (err: any) {
    // Surface PostgREST details to aid debugging
    const payload = {
      error: err?.message ?? "Failed to load tree",
      code: err?.code ?? null,
      hint: err?.hint ?? null,
      details: err?.details ?? null,
    };
    console.error("GET /api/framework/versions/[id]/tree", payload);
    return NextResponse.json(payload, { status: 500 });
  }
}
