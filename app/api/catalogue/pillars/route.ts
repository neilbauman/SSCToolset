// app/api/catalogue/pillars/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listPillarCatalogue,
  createPillar,
  updatePillar,
  deletePillar,
} from "@/lib/services/framework";

/**
 * GET /api/catalogue/pillars?version=:id
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");

  if (!versionId) {
    return NextResponse.json({ error: "version is required" }, { status: 400 });
  }

  try {
    const pillars = await listPillarCatalogue(versionId);
    return NextResponse.json(pillars);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/catalogue/pillars
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    const pillar = await createPillar(name, description);
    return NextResponse.json(pillar);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/catalogue/pillars/:id
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, ...patch } = await req.json();
    const updated = await updatePillar(id, patch);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/catalogue/pillars/:id
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deletePillar(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
