// app/api/framework/versions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishVersion } from "@/lib/services/framework";

// PUT /api/framework/versions/:id → publish version
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // extract :id from path
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }

    const version = await publishVersion(id);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/framework/versions/:id → delete version
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // extract :id from path
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }

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
