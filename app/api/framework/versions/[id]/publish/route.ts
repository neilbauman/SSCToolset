import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(_req: NextRequest, context: any) {
  try {
    const { id } = context.params;
    const { data, error } = await supabaseServer
      .from("framework_versions")
      .update({ status: "published" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
