import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE not set – falling back to anon key.");
}

export const supabaseServer = createClient(url, serviceKey!, {
  auth: { persistSession: false },
});
export default supabaseServer;
