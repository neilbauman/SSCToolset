import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const { country_iso, filename, path } = await request.json();

    if (!country_iso || !filename || !path) {
      return NextResponse.json(
        { error: "Missing required fields: country_iso, filename, or path" },
        { status: 400 }
      );
    }

    const fileExt = filename.split(".").pop()?.toLowerCase() || "zip";
    const format =
      fileExt === "zip" ? "shapefile" : fileExt === "geojson" ? "geojson" : "unknown";

    // Insert layer
    const { data: layer, error: insertError } = await supabase
      .from("gis_layers")
      .insert({
        country_iso,
        layer_name: filename,
        format,
        source: {
          bucket: "gis_raw",
          path,
          url: `${SUPABASE_URL}/storage/v1/object/public/gis_raw/${path}`,
        },
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Add to queue
    const { error: queueError } = await supabase.from("gis_processing_queue").insert({
      layer_id: layer.id,
      status: "pending",
      payload: {
        country_iso,
        bucket: "gis_raw",
        path,
        format,
      },
    });

    if (queueError) throw queueError;

    return NextResponse.json({
      ok: true,
      message: "✅ File registered and queued for processing.",
      layer_id: layer.id,
      format,
    });
  } catch (err: any) {
    console.error("❌ register-upload error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected error in register-upload" },
      { status: 500 }
    );
  }
}
