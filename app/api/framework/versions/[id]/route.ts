// app/api/framework/versions/[id]/route.ts
import { NextResponse } from "next/server";
import {
  deleteVersion,
  publishVersion,
} from "@/lib/services/framework";

/**
 * DELETE /api/framework/versions/:id
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await deleteVersion(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/framework/versions/:id/publish
 */
export async function PUT(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const version = await publishVersion(id);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
