import { NextRequest, NextResponse } from "next/server";
import { listVersions, createDraftFromCatalogue } from "@/lib/services/framework";

export async function GET(_req: NextRequest) {
  try {
    const versions = await listVersions();
    return NextResponse.json({ data: versions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const created = await createDraftFromCatalogue(name);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
