// app/api/catalogue/subthemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listSubthemeCatalogue,
  createSubtheme,
  updateSubtheme,
  deleteSubtheme,
} from "@/lib/services/framework";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("theme");

  if (!themeId) {
    return NextResponse.json({ error: "themeId is required" }, { status: 400 });
  }

  try {
    const subthemes = await listSubthemeCatalogue(themeId);
    return NextResponse.json(subthemes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { themeId, name, description } = await req.json();
    const subtheme = await createSubtheme(themeId, name, description);
    return NextResponse.json(subtheme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, patch } = await req.json();
    const subtheme = await updateSubtheme(id, patch);
    return NextResponse.json(subtheme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteSubtheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
