// app/api/proxy-upload/route.ts
import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remote_url, country_iso } = body;

    if (!remote_url || !country_iso)
      return NextResponse.json(
        { error: "Missing remote_url or country_iso" },
        { status: 400 }
      );

    console.log("📡 Fetching remote file:", remote_url);

    // Fetch file with browser headers
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
    const buffer = Buffer.from(arrayBuffer);

    // Create a file path and upload to Supabase
    const filename = `${crypto.randomUUID()}.zip`;
    const path = `${country_iso}/${filename}`;
    const bucket = "gis_uploads";

    console.log("💾 Uploading to Supabase:", bucket, path);
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: "application/zip", upsert: true });

    if (uploadError) throw uploadError;

    return NextResponse.json({
      ok: true,
      bucket,
      path,
      message: "✅ File fetched and uploaded to Supabase.",
    });
  } catch (err: any) {
    console.error("❌ proxy-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
