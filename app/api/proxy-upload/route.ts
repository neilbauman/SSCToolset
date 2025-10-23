

// app/api/proxy-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "stream";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────
// ✅ 1. Environment setup
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ Missing Supabase env vars. Proxy upload disabled.");
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ─────────────────────────────────────────────────────────────
// ✅ 2. Streaming upload handler
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          error: "Supabase not configured. Missing environment variables.",
          hint: "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel settings.",
        },
        { status: 500 }
      );
    }

    // Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const countryIso = formData.get("country_iso") as string | null;

    if (!file || !countryIso) {
      return NextResponse.json(
        { error: "Missing file or country_iso field." },
        { status: 400 }
      );
    }

    // Upload path
    const bucket = "gis_raw";
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "zip";
    const fileName = `${countryIso.toLowerCase()}_${randomUUID()}.${fileExt}`;

    console.log(`⬆️ Starting stream upload of ${fileName}...`);

    // ✅ Convert the web ReadableStream to Node.js stream (no buffering)
    const nodeStream = Readable.fromWeb(file.stream());

    // ✅ Stream upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, nodeStream, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("❌ Storage upload failed:", error);
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }

    const storagePath = data.path;
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

    // ✅ Insert into gis_layers
    const { data: insert, error: insertError } = await supabase
      .from("gis_layers")
      .insert({
        country_iso: countryIso,
        layer_name: file.name,
        source: { bucket, path: storagePath, url: storageUrl },
        format: fileExt === "zip" ? "shapefile" : fileExt,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      return NextResponse.json(
        { error: "Database insert failed: " + insertError.message },
        { status: 500 }
      );
    }

    // ✅ Add to processing queue
    await supabase.from("gis_processing_queue").insert({
      layer_id: insert.id,
      status: "pending",
      payload: { country_iso: countryIso, file_type: fileExt, bucket, path: storagePath },
    });

    console.log(`✅ Upload complete and queued for processing: ${fileName}`);

    return NextResponse.json({
      ok: true,
      message: "✅ GIS layer uploaded and queued for processing.",
      layer_id: insert.id,
      country_iso: countryIso,
      format: fileExt,
      queue_status: "pending",
    });
  } catch (err: any) {
    console.error("❌ Proxy upload error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
