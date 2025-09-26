import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(_req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const { data, error } = await supabaseServer
      .from("framework_versions")
      .update({ status: "published" })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
