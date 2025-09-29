// app/api/framework/versions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishVersion, deleteVersion } from "@/lib/services/framework";

/**
 * PUT /api/framework/versions/:id
 * Publishes a draft version
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const version = await publishVersion(params.id);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/framework/versions/:id
 * Deletes a framework version
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteVersion(params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
