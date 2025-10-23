// app/api/proxy-upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We'll use the public key here since uploads are client-level.
const supabase = createClient(supabaseUrl, supabaseAnon);

export const runtime = "nodejs"; // ensures streaming works in Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remote_url, country_iso = "UNK" } = body;

    if (!remote_url)
      return NextResponse.json({ error: "Missing remote_url" }, { status: 400 });

    console.log("📡 Downloading from:", remote_url);

    // Download remote file
    const response = await fetch(remote_url, {
      headers: { "User-Agent": "SSC-Toolset-Proxy/1.0" },
    });

    if (!response.ok)
      return NextResponse.json(
        { error: `Download failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );

    const arrayBuffer = await response.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Save to Supabase Storage
    const filename = `${crypto.randomUUID()}.zip`;
    const storagePath = `${country_iso}/${filename}`;
    console.log("💾 Uploading to Supabase:", storagePath);

    const { error: uploadErr } = await supabase.storage
      .from("gis_uploads")
      .upload(storagePath, fileBytes, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    console.log("✅ Upload successful:", storagePath);

    return NextResponse.json({
      ok: true,
      bucket: "gis_uploads",
      path: storagePath,
      message: "✅ File successfully proxied to Supabase.",
    });
  } catch (err: any) {
    console.error("❌ proxy-upload error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
