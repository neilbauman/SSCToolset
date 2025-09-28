import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { listPillarCatalogue } from "@/lib/services/framework";

/** GET /api/catalogue/pillars?version=:id
 *  Returns catalogue pillars + alreadyIn flag for a given version.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");

  try {
    // 1. Load all catalogue pillars
    const pillars = await listPillarCatalogue();

    if (!versionId) {
      return NextResponse.json({ data: pillars.map((p) => ({ ...p, alreadyIn: false })) });
    }

    // 2. Find which pillars are already in this version
    const { data: existing, error } = await supabaseServer
      .from("framework_version_items")
      .select("pillar_id")
      .eq("version_id", versionId);

    if (error) throw error;

    const existingIds = new Set((existing ?? []).map((r: any) => r.pillar_id));

    // 3. Mark alreadyIn
    const data = pillars.map((p) => ({
      ...p,
      alreadyIn: existingIds.has(p.id),
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Failed to load catalogue" }, { status: 500 });
  }
}
