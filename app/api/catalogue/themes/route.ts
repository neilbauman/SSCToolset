// app/api/catalogue/themes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listThemeCatalogue,
  createTheme,
  updateTheme,
  deleteTheme,
} from "@/lib/services/framework";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pillarId = searchParams.get("pillar");

  if (!pillarId) {
    return NextResponse.json({ error: "pillarId is required" }, { status: 400 });
  }

  try {
    const themes = await listThemeCatalogue(pillarId);
    return NextResponse.json(themes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { pillarId, name, description } = await req.json();
    const theme = await createTheme(pillarId, name, description);
    return NextResponse.json(theme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, patch } = await req.json();
    const theme = await updateTheme(id, patch);
    return NextResponse.json(theme);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteTheme(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
