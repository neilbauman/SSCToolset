// app/api/framework/versions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishVersion, deleteVersion } from "@/lib/services/framework";

// PUT /api/framework/versions/:id → publish or unpublish version
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // extract :id from path
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }

    // Expect request body: { publish: true | false }
    const { publish } = await req.json();
    if (typeof publish !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'publish' flag" },
        { status: 400 }
      );
    }

    const version = await publishVersion(id, publish);
    return NextResponse.json(version);
  } catch (err: any) {
    console.error("PUT /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/framework/versions/:id → delete version
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // extract :id from path
    if (!id) {
      return NextResponse.json({ error: "Missing version id" }, { status: 400 });
    }

    await deleteVersion(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /framework/versions/:id error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
