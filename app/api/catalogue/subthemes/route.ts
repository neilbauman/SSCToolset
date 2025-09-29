// app/api/catalogue/subthemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listSubthemeCatalogue,
  createSubtheme,
  updateSubtheme,
  deleteSubtheme,
} from "@/lib/services/framework";

// GET /api/catalogue/subthemes?version=:id&theme=:themeId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");
  const themeId = searchParams.get("theme");
  if (!versionId || !themeId) {
    return NextResponse.json(
      { error: "version and theme query params required" },
      { status: 400 }
    );
  }
  try {
    const subthemes = await listSubthemeCatalogue(versionId, themeId);
    return NextResponse.json(subthemes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/catalogue/subthemes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { themeId, name, description } = body;
  if (!themeId || !name) {
    return NextResponse.json(
      { error: "themeId and name are required" },
      { status: 400 }
    );
  }
  try {
    const subtheme = await createSubtheme(themeId, name, description);
    return NextResponse.json(subtheme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/catalogue/subthemes/:id
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const body = await req.json();
  try {
    const updated = await updateSubtheme(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/catalogue/subthemes/:id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    await deleteSubtheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
