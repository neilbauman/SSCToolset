import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(request: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("⚠️ Missing Supabase environment variables.");
      return NextResponse.json(
        { error: "Missing Supabase credentials" },
        { status: 500 }
      );
    }

    // ✅ Create Supabase client lazily at runtime
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const fileBuffer = Buffer.from(await request.arrayBuffer());

    const { error } = await supabase.storage
      .from("gis_raw")
      .upload(path, fileBuffer, { contentType, upsert: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: "✅ File uploaded successfully.",
      path,
      url: `${SUPABASE_URL}/storage/v1/object/public/gis_raw/${path}`,
    });
  } catch (err: any) {
    console.error("❌ upload-file error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
