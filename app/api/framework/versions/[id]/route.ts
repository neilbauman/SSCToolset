// app/api/framework/versions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishVersion, deleteVersion } from "@/lib/services/framework";

// PUT /api/framework/versions/:id → publish version
export async function PUT(req: NextRequest, context: any) {
  const id = context.params.id as string;
  try {
    const version = await publishVersion(id);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/framework/versions/:id → delete version
export async function DELETE(req: NextRequest, context: any) {
  const id = context.params.id as string;
  try {
    const result = await deleteVersion(id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
