import { createClient } from "@supabase/supabase-js";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const serviceKey = process.env["SUPABASE_SERVICE_ROLE"]!;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) console.warn("WARNING: SUPABASE_SERVICE_ROLE not set. Writes may fail if RLS/policies enabled.");

export const supabaseServer = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
