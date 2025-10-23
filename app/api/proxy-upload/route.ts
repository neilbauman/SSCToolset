// app/api/proxy-upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// This endpoint allows large local ZIP uploads to be streamed to Supabase storage.
// Browser → Next.js API Route (Node.js Stream) → Supabase Storage
export const maxDuration = 300; // 5 minutes runtime (Vercel max)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data upload" },
        { status: 400 }
      );
    }

    // Parse form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const country_iso = (form.get("country_iso") as string)?.toUpperCase();
    if (!file || !country_iso) {
      return NextResponse.json(
        { error: "Missing required fields (file, country_iso)" },
        { status: 400 }
      );
    }

    const fileType = file.name.split(".").pop()?.toLowerCase() || "zip";
    const format =
      fileType === "zip"
        ? "shapefile"
        : fileType === "gdb"
        ? "geodatabase"
        : "unknown";

    // Create unique filename and path
    const layer_id = randomUUID();
    const bucket = "gis_raw";
    const objectPath = `${country_iso}/${layer_id}_${file.name}`;

    console.log(`📦 Uploading ${file.name} (${file.size} bytes) to ${objectPath}`);

    // Upload file as a binary stream to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError)
      throw new Error(`Supabase upload failed: ${uploadError.message}`);

    // Register GIS layer in DB
    const { data: layer, error: insertError } = await supabase
      .from("gis_layers")
      .insert([
        {
          id: layer_id,
          country_iso,
          layer_name: file.name,
          format,
          source: { bucket, path: objectPath },
        },
      ])
      .select()
      .single();

    if (insertError)
      throw new Error(`Failed to register layer: ${insertError.message}`);

    // Queue for processing
    const { error: queueError } = await supabase
      .from("gis_processing_queue")
      .insert([
        {
          layer_id,
          status: "pending",
          payload: {
            bucket,
            path: objectPath,
            country_iso,
            format,
            file_type: fileType,
          },
        },
      ]);

    if (queueError)
      throw new Error(`Failed to enqueue processing job: ${queueError.message}`);

    console.log(`✅ Uploaded and queued layer ${layer_id}`);

    return NextResponse.json({
      ok: true,
      message: "✅ GIS layer uploaded and queued for processing.",
      layer_id,
      country_iso,
      format,
      file_type: fileType,
      size_mb: (file.size / (1024 * 1024)).toFixed(2),
      storage_path: `${bucket}/${objectPath}`,
    });
  } catch (err: any) {
    console.error("❌ proxy-upload error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
