import { NextResponse } from "next/server";
import { listVersions, createDraftFromCatalogue } from "@/lib/services/framework";

export async function GET() {
  try {
    const versions = await listVersions();
    return NextResponse.json({ data: versions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const version = await createDraftFromCatalogue(name);
    return NextResponse.json({ data: version }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
