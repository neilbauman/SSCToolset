import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const uniqueName = `${randomUUID()}_${filename}`;
    const path = uniqueName;

    // Pre-register the file path; the UI will PUT the file to this route
    return NextResponse.json({
      ok: true,
      uploadPath: path,
      uploadUrl: `/api/upload-file?path=${encodeURIComponent(path)}`,
      contentType: contentType || "application/octet-stream",
    });
  } catch (err: any) {
    console.error("❌ sign-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
