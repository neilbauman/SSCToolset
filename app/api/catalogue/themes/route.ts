// app/api/catalogue/themes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listThemeCatalogue,
  createTheme,
  updateTheme,
  deleteTheme,
} from "@/lib/services/framework";

// GET /api/catalogue/themes?version=:id&pillar=:pillarId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");
  const pillarId = searchParams.get("pillar");
  if (!versionId || !pillarId) {
    return NextResponse.json(
      { error: "version and pillar query params required" },
      { status: 400 }
    );
  }
  try {
    const themes = await listThemeCatalogue(versionId, pillarId);
    return NextResponse.json(themes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/catalogue/themes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pillarId, name, description } = body;
  if (!pillarId || !name) {
    return NextResponse.json(
      { error: "pillarId and name are required" },
      { status: 400 }
    );
  }
  try {
    const theme = await createTheme(pillarId, name, description);
    return NextResponse.json(theme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/catalogue/themes/:id
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const body = await req.json();
  try {
    const updated = await updateTheme(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/catalogue/themes/:id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    await deleteTheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
