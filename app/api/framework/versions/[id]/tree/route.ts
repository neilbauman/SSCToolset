import { NextResponse } from "next/server";
import { getVersionTree } from "@/lib/services/framework";

// NOTE: In Next.js 15, do NOT add a structural type to the 2nd arg.
// Use `any`/`unknown` or leave it untyped, then read context.params.
export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string;
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }

    const tree = await getVersionTree(id);
    return NextResponse.json(tree);
  } catch (err: any) {
    console.error("GET /api/framework/versions/[id]/tree", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load tree" },
      { status: 500 }
    );
  }
}
