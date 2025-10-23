import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    // ✅ Old syntax: second argument is a number (seconds to expire)
    const { data, error } = await supabase.storage
      .from("gis_raw")
      .createSignedUploadUrl(filename, 3600); // 1 hour expiry

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      url: data.signedUrl,
      path: data.path,
      contentType,
    });
  } catch (err: any) {
    console.error("❌ sign-upload error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected error in sign-upload" },
      { status: 500 }
    );
  }
}
