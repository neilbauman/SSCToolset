// app/api/framework/versions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// PUT /api/framework/versions/:id → publish version
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id;
  try {
    const version = await publishVersion(id);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/framework/versions/:id → delete version
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id;
  try {
    // replace with proper deleteVersion service when available
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/framework_versions?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );

    if (!res.ok) throw new Error("Failed to delete version");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
