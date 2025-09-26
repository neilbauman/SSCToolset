import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE not set. Falling back to public anon key.");
}

export const supabaseServer = createClient(url, serviceKey!, {
  auth: { persistSession: false },
});
export default supabaseServer;
