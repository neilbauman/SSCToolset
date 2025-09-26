import { NextResponse } from "next/server";
import { listVersions, createDraftFromCatalogue } from "@/lib/services/framework";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function GET() {
  try {
    const data = await listVersions();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

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
