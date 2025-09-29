// app/api/catalogue/pillars/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listPillarCatalogue,
  createPillar,
  updatePillar,
  deletePillar,
} from "@/lib/services/framework";

// GET /api/catalogue/pillars?version=:id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("version");
  if (!versionId) {
    return NextResponse.json(
      { error: "version query param required" },
      { status: 400 }
    );
  }
  try {
    const pillars = await listPillarCatalogue(versionId);
    return NextResponse.json(pillars);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/catalogue/pillars
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description } = body;
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const pillar = await createPillar(name, description);
    return NextResponse.json(pillar);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/catalogue/pillars/:id
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const body = await req.json();
  try {
    const updated = await updatePillar(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/catalogue/pillars/:id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    await deletePillar(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
