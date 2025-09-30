// app/api/catalogue/themes/route.ts
import { NextResponse } from "next/server";
import { listThemeCatalogue } from "@/lib/services/framework";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("versionId");
  const pillarId = searchParams.get("pillarId");

  if (!versionId || !pillarId) {
    return NextResponse.json(
      { error: "versionId and pillarId are required" },
      { status: 400 }
    );
  }

  try {
    const themes = await listThemeCatalogue(versionId, pillarId);
    return NextResponse.json(themes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
