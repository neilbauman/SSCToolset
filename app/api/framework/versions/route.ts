import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraftFromCatalogue, listVersions } from "@/lib/services/framework";

export async function GET(request: Request) {
  try {
    const data = await listVersions();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const CreateSchema = z.object({ name: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { name } = CreateSchema.parse(json);
    const version = await createDraftFromCatalogue(name);
    return NextResponse.json({ data: version }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
