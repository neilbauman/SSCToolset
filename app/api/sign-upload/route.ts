import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("⚠️ Missing Supabase environment variables.");
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { filename } = await req.json();
    if (!filename)
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });

    const uniqueName = `${randomUUID()}_${filename}`;
    const bucket = "gis_raw";

    // ✅ Generate a Supabase-signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueName);

    if (error || !data?.signedUrl) {
      console.error("❌ Failed to create signed upload URL:", error);
      throw new Error(error?.message || "No signed URL returned");
    }

    return NextResponse.json({
      ok: true,
      bucket,
      uploadPath: uniqueName,
      uploadUrl: data.signedUrl, // ← actual Supabase upload URL
    });
  } catch (err: any) {
    console.error("❌ sign-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
