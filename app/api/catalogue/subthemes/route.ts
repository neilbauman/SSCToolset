// app/api/catalogue/subthemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listSubthemeCatalogue,
  createSubtheme,
  updateSubtheme,
  deleteSubtheme,
} from "@/lib/services/framework";

/**
 * GET /api/catalogue/subthemes?version=:id&theme=:id
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");
  const themeId = searchParams.get("theme");

  if (!versionId) {
    return NextResponse.json({ error: "version is required" }, { status: 400 });
  }

  try {
    const subthemes = await listSubthemeCatalogue(versionId, themeId ?? undefined);
    return NextResponse.json(subthemes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/catalogue/subthemes
 */
export async function POST(req: NextRequest) {
  try {
    const { themeId, name, description } = await req.json();
    const subtheme = await createSubtheme(themeId, name, description);
    return NextResponse.json(subtheme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/catalogue/subthemes/:id
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, ...patch } = await req.json();
    const updated = await updateSubtheme(id, patch);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/catalogue/subthemes/:id
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteSubtheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
