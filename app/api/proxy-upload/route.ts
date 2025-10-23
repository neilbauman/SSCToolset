// app/api/proxy-upload/route.ts
import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remote_url, country_iso } = body;

    if (!remote_url || !country_iso) {
      return NextResponse.json(
        { error: "Missing remote_url or country_iso" },
        { status: 400 }
      );
    }

    console.log("🌐 Fetching remote file:", remote_url);

    // Fetch the remote file
    const resp = await fetch(remote_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
        Accept: "application/octet-stream, application/zip, */*",
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch remote file: ${resp.status} ${resp.statusText}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Determine file name
    const fileName =
      remote_url.split("/").pop()?.split("?")[0] || `gis_upload_${Date.now()}.zip`;

    console.log("📦 Uploading file to Supabase storage:", fileName);

    // Upload to Supabase storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("gis_raw")
      .upload(fileName, fileBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const storagePath = uploadData?.path || fileName;

    // Register GIS layer
    const { data: layerData, error: layerError } = await supabase
      .from("gis_layers")
      .insert([
        {
          country_iso,
          layer_name: fileName,
          format: "shapefile",
          source: { bucket: "gis_raw", path: storagePath },
        },
      ])
      .select("id")
      .single();

    if (layerError) throw layerError;

    const layerId = layerData.id;

    // Queue the processing job
    const { error: queueError } = await supabase.from("gis_processing_queue").insert([
      {
        layer_id: layerId,
        status: "pending",
        payload: {
          country_iso,
          remote_url,
          file_type: "zip",
          format: "shapefile",
        },
      },
    ]);

    if (queueError) throw queueError;

    console.log("✅ Layer registered and queued:", layerId);

    return NextResponse.json({
      ok: true,
      message: "✅ GIS layer registered and queued for processing.",
      layer_id: layerId,
      country_iso,
      format: "shapefile",
      file_type: "zip",
      queue_status: "pending",
    });
  } catch (err: any) {
    console.error("❌ proxy-upload error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Proxy upload endpoint active" });
}
