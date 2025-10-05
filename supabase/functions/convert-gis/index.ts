// /supabase/functions/convert-gis/index.ts
// Supabase Edge Function: converts uploaded shapefile ZIPs → simplified GeoJSON

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mapshaper from "npm:mapshaper";

serve(async (req) => {
  try {
    const { bucket, path, country_iso, version_id } = await req.json();

    if (!bucket || !path || !country_iso || !version_id) {
      return new Response("Missing parameters", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Download ZIP from gis_raw
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data)
      throw new Error("Failed to download shapefile: " + error?.message);

    const buffer = await data.arrayBuffer();

    // 2️⃣ Convert with mapshaper
    const result = await mapshaper.applyCommands(
      "-i input.zip combine-files -simplify 5% keep-shapes -o format=geojson precision=0.0001",
      { "input.zip": new Uint8Array(buffer) }
    );

    const geojson = result["input.json"];
    if (!geojson) throw new Error("No GeoJSON output from mapshaper");

    // 3️⃣ Upload to gis bucket
    const geoPath = `${country_iso}/${version_id}/layer.geojson`;
    const { error: upErr } = await supabase.storage
      .from("gis")
      .upload(geoPath, geojson, {
        contentType: "application/geo+json",
        upsert: true,
      });
    if (upErr) throw upErr;

    // 4️⃣ Record layer metadata
    await supabase.from("gis_layers").insert({
      country_iso,
      dataset_version_id: version_id,
      layer_name: "layer.geojson",
      format: "geojson",
      crs: "EPSG:4326",
      source: { path: geoPath },
    });

    // 5️⃣ Activate the dataset version
    await supabase
      .from("gis_dataset_versions")
      .update({ is_active: true, source: "Server conversion" })
      .eq("id", version_id);

    return new Response(
      JSON.stringify({ ok: true, message: "Conversion complete" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in convert-gis function:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
