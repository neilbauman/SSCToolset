import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { createPillar, listPillarCatalogue } from "@/lib/services/framework";

/** GET /api/catalogue/pillars?version=:id
 *  Returns catalogue pillars + alreadyIn flag for a given version.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get("version") ?? undefined;

    const pillars = await listPillarCatalogue();

    if (!versionId) {
      // no version context: mark all as not in
      const payload = pillars.map((p) => ({ ...p, alreadyIn: false }));
      return NextResponse.json({ data: payload });
    }

    // find pillars already in this version
    const { data: items, error } = await supabaseServer
      .from("framework_version_items")
      .select("pillar_id")
      .eq("version_id", versionId)
      .neq("pillar_id", null);
    if (error) throw error;

    const inVersion = new Set<string>();
    (items ?? []).forEach((r: any) => r.pillar_id && inVersion.add(r.pillar_id));

    const payload = pillars.map((p) => ({
      ...p,
      alreadyIn: inVersion.has(p.id),
    }));
    return NextResponse.json({ data: payload });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

/** POST /api/catalogue/pillars
 *  Body:
 *   - versionId (string, required)
 *   - existingId? (string)  // link from catalogue
 *   - name?, description?   // create new in catalogue
 *   - includeChildren? (boolean)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const versionId = String(body.versionId ?? "");
    if (!versionId) {
      return NextResponse.json({ error: "Missing versionId" }, { status: 400 });
    }

    const data = {
      existingId: body.existingId as string | undefined,
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      includeChildren: Boolean(body.includeChildren),
    };

    const result = await createPillar(versionId, data);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
