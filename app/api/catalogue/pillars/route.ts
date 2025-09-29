// app/api/catalogue/pillars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listPillarCatalogue, createPillar } from "@/lib/services/framework";

/**
 * GET /api/catalogue/pillars?version=:id
 * Returns all catalogue pillars + alreadyIn flag for a given version.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get("version");

    if (!versionId) {
      return NextResponse.json(
        { error: "Missing required parameter: version" },
        { status: 400 }
      );
    }

    const pillars = await listPillarCatalogue(versionId);
    return NextResponse.json(pillars);
  } catch (err: any) {
    console.error("GET /catalogue/pillars error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/catalogue/pillars
 * Body: { name: string, description?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const pillar = await createPillar(name, description || "");
    return NextResponse.json(pillar);
  } catch (err: any) {
    console.error("POST /catalogue/pillars error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
