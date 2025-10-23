import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const { country_iso, filename, path } = await req.json();

    if (!country_iso || !filename || !path)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const bucket = "gis_raw";
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    const format = filename.endsWith(".zip") ? "shapefile" : "gdb";

    // Insert GIS layer
    const { data, error } = await supabase
      .from("gis_layers")
      .insert({
        country_iso,
        layer_name: filename,
        source: { bucket, path, url: storageUrl },
        format,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("gis_processing_queue").insert({
      layer_id: data.id,
      status: "pending",
      payload: { country_iso, bucket, path, format },
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("❌ register-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
