// app/api/catalogue/themes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listThemeCatalogue,
  createTheme,
  updateTheme,
  deleteTheme,
} from "@/lib/services/framework";

/**
 * GET /api/catalogue/themes?version=:id&pillar=:id
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");
  const pillarId = searchParams.get("pillar");

  if (!versionId) {
    return NextResponse.json({ error: "version is required" }, { status: 400 });
  }

  try {
    const themes = await listThemeCatalogue(versionId, pillarId || undefined);
    return NextResponse.json(themes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/catalogue/themes
 */
export async function POST(req: NextRequest) {
  try {
    const { pillarId, name, description } = await req.json();
    const theme = await createTheme(pillarId, name, description);
    return NextResponse.json(theme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/catalogue/themes/:id
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, ...patch } = await req.json();
    const updated = await updateTheme(id, patch);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/catalogue/themes/:id
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteTheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
