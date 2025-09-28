import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { listPillarCatalogue, createPillar } from "@/lib/services/framework";

/** GET /api/catalogue/pillars?version=:id
 *  Returns all catalogue pillars + alreadyIn flag for a given version.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");

  try {
    // Load all catalogue pillars (no sort_order column)
    const pillars = await listPillarCatalogue();

    if (!versionId) {
      return NextResponse.json({
        data: pillars.map((p) => ({ ...p, alreadyIn: false })),
      });
    }

    // Which pillars already exist in this version?
    const { data: existing, error } = await supabaseServer
      .from("framework_version_items")
      .select("pillar_id")
      .eq("version_id", versionId);

    if (error) throw error;

    const existingIds = new Set((existing ?? []).map((r: any) => r.pillar_id));

    const data = pillars.map((p) => ({
      ...p,
      alreadyIn: existingIds.has(p.id),
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("GET /api/catalogue/pillars failed", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load catalogue" },
      { status: 500 }
    );
  }
}

/** POST /api/catalogue/pillars
 *  Body: { versionId, existingId?, name?, description?, includeChildren? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { versionId, existingId, name, description, includeChildren } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "Missing versionId" },
        { status: 400 }
      );
    }

    const result = await createPillar(versionId, {
      existingId,
      name,
      description,
      includeChildren: !!includeChildren,
    });

    return NextResponse.json({ data: result });
  } catch (e: any) {
    console.error("POST /api/catalogue/pillars failed", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to add pillar" },
      { status: 500 }
    );
  }
}
