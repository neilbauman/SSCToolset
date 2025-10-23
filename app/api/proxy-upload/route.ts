import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────
// ✅ 1. Environment safety checks
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Guard against missing configuration during build or runtime
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ Missing Supabase environment variables. Proxy upload may be disabled.");
}

// Initialize client only if keys exist
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ─────────────────────────────────────────────────────────────
// ✅ 2. POST handler for large uploads
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const countryIso = formData.get("country_iso") as string | null;

    if (!file || !countryIso) {
      return NextResponse.json(
        { error: "Missing file or country_iso field." },
        { status: 400 }
      );
    }

    // Define upload target
    const bucket = "gis_raw";
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "zip";
    const fileName = `${countryIso.toLowerCase()}_${randomUUID()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();

    console.log(`⬆️ Uploading file ${fileName} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("❌ Storage upload failed:", error);
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }

    const storagePath = data.path;
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

    // Register layer in the database
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

    // Add to processing queue
    await supabase.from("gis_processing_queue").insert({
      layer_id: insert.id,
      status: "pending",
      payload: { country_iso: countryIso, file_type: fileExt, bucket, path: storagePath },
    });

    console.log(`✅ File queued for processing: ${fileName}`);

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
