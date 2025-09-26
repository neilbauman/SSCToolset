"use client";

import { createClient } from "@supabase/supabase-js";

// Env vars are now strongly typed via env.d.ts
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const supabaseBrowser = createClient(url, anon);
