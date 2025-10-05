// /app/api/convert-gis/route.ts
// Converts a zipped shapefile stored in gis_raw → GeoJSON in gis

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServer";

export const runtime = "nodejs"; // ensures server execution on Vercel

// Lazy-loaded mapshaper (to avoid bundling errors)
let mapshaper: any = null;

export async function POST(req: NextRequest) {
  try {
    const { bucket, path, country_iso, version_id } = await req.json();
    if (!bucket || !path || !country_iso || !version_id) {
      return NextResponse.json(
        { ok: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    // ⚙️ Load mapshaper dynamically at runtime
    if (!mapshaper) {
      mapshaper = (await import("mapshaper")).default;
    }

    // 1️⃣ Download ZIP from gis_raw bucket
    const { data, error: dlError } = await supabaseServer.storage
      .from(bucket)
      .download(path);
    if (dlError || !data) throw new Error("Download failed: " + dlError?.message);

    const arrayBuf = await data.arrayBuffer();

    // 2️⃣ Convert & simplify with mapshaper
    const result = await mapshaper.applyCommands(
      "-i input.zip combine-files -simplify 5% keep-shapes -o format=geojson precision=0.0001",
      { "input.zip": new Uint8Array(arrayBuf) }
    );

    const geojson = result["input.json"];

    // 3️⃣ Upload simplified GeoJSON to public 'gis' bucket
    const geoPath = `${country_iso}/${version_id}/layer.geojson`;
    const { error: upErr } = await supabaseServer.storage
      .from("gis")
      .upload(geoPath, geojson, {
        contentType: "application/geo+json",
        upsert: true,
      });
    if (upErr) throw upErr;

    // 4️⃣ Insert GIS layer metadata
    await supabaseServer.from("gis_layers").insert({
      country_iso,
      dataset_version_id: version_id,
      layer_name: "layer.geojson",
      format: "geojson",
      crs: "EPSG:4326",
      source: { path: geoPath },
    });

    // 5️⃣ Mark dataset version active
    await supabaseServer
      .from("gis_dataset_versions")
      .update({ is_active: true, source: "Server conversion" })
      .eq("id", version_id);

    return NextResponse.json({
      ok: true,
      message: "Conversion complete",
    });
  } catch (err: any) {
    console.error("Error in convert-gis:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
