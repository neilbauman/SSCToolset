// app/api/catalogue/subthemes/route.ts
import { NextResponse } from "next/server";
import { listSubthemeCatalogue } from "@/lib/services/framework";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("versionId");
  const themeId = searchParams.get("themeId");

  if (!versionId || !themeId) {
    return NextResponse.json(
      { error: "versionId and themeId are required" },
      { status: 400 }
    );
  }

  try {
    const subthemes = await listSubthemeCatalogue(versionId, themeId);
    return NextResponse.json(subthemes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
