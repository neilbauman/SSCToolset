import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServer";
import { tmpdir } from "os";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { bucket, path, country_iso, version_id } = await req.json();
    if (!bucket || !path || !country_iso || !version_id) {
      return NextResponse.json(
        { ok: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    // 1️⃣ Download ZIP from gis_raw
    const { data, error: dlError } = await supabaseServer.storage
      .from(bucket)
      .download(path);
    if (dlError || !data)
      throw new Error("Download failed: " + dlError?.message);

    const arrayBuf = await data.arrayBuffer();

    // 2️⃣ Write ZIP to a temporary file
    const tmpZip = join(tmpdir(), `${version_id}.zip`);
    writeFileSync(tmpZip, Buffer.from(arrayBuf));

    // 3️⃣ Run mapshaper CLI to convert + simplify
    const tmpOut = join(tmpdir(), `${version_id}.geojson`);
    const cmd = `npx mapshaper -i ${tmpZip} combine-files -simplify 5% keep-shapes -o format=geojson precision=0.0001 ${tmpOut}`;
    execSync(cmd, { stdio: "pipe" });

    // 4️⃣ Read the resulting GeoJSON
    const geojson = readFileSync(tmpOut);

    // 5️⃣ Upload to gis bucket
    const geoPath = `${country_iso}/${version_id}/layer.geojson`;
    const { error: upErr } = await supabaseServer.storage
      .from("gis")
      .upload(geoPath, geojson, {
        contentType: "application/geo+json",
        upsert: true,
      });
    if (upErr) throw upErr;

    // 6️⃣ Insert GIS layer metadata
    await supabaseServer.from("gis_layers").insert({
      country_iso,
      dataset_version_id: version_id,
      layer_name: "layer.geojson",
      format: "geojson",
      crs: "EPSG:4326",
      source: { path: geoPath },
    });

    // 7️⃣ Mark dataset version as active
    await supabaseServer
      .from("gis_dataset_versions")
      .update({ is_active: true, source: "Server conversion" })
      .eq("id", version_id);

    // 8️⃣ Clean up temp files
    try {
      unlinkSync(tmpZip);
      unlinkSync(tmpOut);
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Conversion complete",
    });
  } catch (err: any) {
    console.error("Error in /api/convert-gis:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
