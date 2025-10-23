import fetch from "node-fetch";
import AdmZip from "adm-zip";
import mapshaper from "mapshaper";
import { createClient } from "@supabase/supabase-js";

/* ---------------- CONFIGURATION ---------------- */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety check
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
console.log("🛰️  GIS worker connected to Supabase:", SUPABASE_URL);

/* ---------------- WORKER LOOP ---------------- */
async function processQueue() {
  console.log("🔄 Checking for pending GIS jobs...");

  const { data: jobs, error } = await supabase
    .from("gis_processing_queue")
    .select("*")
    .eq("status", "pending")
    .limit(1);

  if (error) {
    console.error("❌ Error fetching queue:", error);
    return;
  }

  if (!jobs?.length) {
    console.log("✅ No pending jobs.");
    return;
  }

  const job = jobs[0];
  console.log("🧩 Processing job:", job.id, job.remote_url);

  try {
    // 1️⃣ Download the ZIP or file
    const response = await fetch(job.remote_url);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const zip = new AdmZip(Buffer.from(buffer));
    const tempDir = `/tmp/${job.id}`;
    zip.extractAllTo(tempDir, true);

    console.log("📦 Extracted files:", zip.getEntries().map(e => e.entryName));

    // 2️⃣ Convert & simplify GeoJSON using mapshaper
    // (convert all shapefiles inside the zip to a single GeoJSON)
    const cmd = `-i ${tempDir}/*.shp -simplify 5% keep-shapes -o format=geojson combine-files`;
    const geojson = await mapshaper.applyCommands(cmd);
    const output = JSON.parse(geojson);

    // 3️⃣ Upload the simplified GeoJSON to Supabase storage
    const bucket = "gis";
    const filePath = `${job.country_iso}/${job.id}.geojson`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, JSON.stringify(output), {
        contentType: "application/geo+json",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4️⃣ Update database status
    await supabase
      .from("gis_layers")
      .update({
        format: "geojson",
        source: { bucket, path: filePath },
        is_active: true,
      })
      .eq("id", job.layer_id);

    await supabase
      .from("gis_processing_queue")
      .update({ status: "completed", finished_at: new Date().toISOString() })
      .eq("id", job.id);

    console.log(`✅ Completed job ${job.id}`);
  } catch (err) {
    console.error("❌ Failed job:", err);

    await supabase
      .from("gis_processing_queue")
      .update({
        status: "failed",
        error_message: err.message || "Unknown error",
      })
      .eq("id", job.id);
  }
}

/* ---------------- MAIN LOOP ---------------- */
(async function main() {
  console.log("🚀 GIS background worker started.");
  while (true) {
    await processQueue();
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10s between checks
  }
})();
