import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { runCommands } from "mapshaper";

// read env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("🛰️  GIS processor started");
  while (true) {
    try {
      const { data: job } = await supabase
        .from("gis_processing_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!job) {
        await sleep(15000);
        continue;
      }

      console.log(`📦 Processing ${job.path}`);
      await supabase
        .from("gis_processing_queue")
        .update({ status: "processing" })
        .eq("id", job.id);

      const tmpDir = "./tmp";
      fs.mkdirSync(tmpDir, { recursive: true });
      const localZip = path.join(tmpDir, "file.zip");

      const { data, error } = await supabase.storage
        .from(job.bucket)
        .download(job.path);
      if (error) throw error;

      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(localZip, buffer);

      // unzip
      const zip = new AdmZip(localZip);
      zip.extractAllTo(tmpDir, true);

      // find first .shp or .geojson
      const shpPath = fs
        .readdirSync(tmpDir)
        .find((f) => f.endsWith(".shp") || f.endsWith(".geojson"));
      if (!shpPath) throw new Error("No shapefile or GeoJSON found");

      const inputPath = path.join(tmpDir, shpPath);
      const outputPath = path.join(tmpDir, "out.geojson");

      console.log("🧭 Converting & simplifying...");
      await runCommands(
        `-i "${inputPath}" -simplify 5% keep-shapes -o format=geojson "${outputPath}"`
      );

      const geo = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      const features = geo.features || [];
      console.log(`✅ ${features.length} features ready for insert`);

      for (const f of features) {
        await supabase.from("gis_features").insert({
          layer_id: job.layer_id,
          country_iso: job.country_iso,
          admin_level: job.admin_level,
          pcode: f.properties?.pcode || null,
          name: f.properties?.name || null,
          geom: f.geometry
        });
      }

      await supabase
        .from("gis_processing_queue")
        .update({ status: "done" })
        .eq("id", job.id);
      console.log("🎉 Job done");
    } catch (err) {
      console.error("❌ Worker error:", err);
      await supabase
        .from("gis_processing_queue")
        .update({ status: "error", error: err.message })
        .eq("status", "processing");
      await sleep(30000);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main();
