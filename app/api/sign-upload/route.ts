import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const uniqueName = `${randomUUID()}_${filename}`;
    const path = uniqueName;

    // Return the temporary API upload path
    return NextResponse.json({
      ok: true,
      uploadPath: path,
      uploadUrl: `/api/upload-file?path=${encodeURIComponent(path)}`,
      contentType: contentType || "application/octet-stream",
    });
  } catch (err: any) {
    console.error("❌ sign-upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
