import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType)
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });

    const { data, error } = await supabase.storage
      .from("gis_raw")
      .createSignedUploadUrl(filename, 3600); // valid for 1 hour

    if (error) throw error;

    return NextResponse.json({ url: data.signedUrl, path: data.path });
  } catch (err: any) {
    console.error("❌ sign-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
