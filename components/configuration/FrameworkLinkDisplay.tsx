"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type FrameworkLinkDisplayProps = {
  pillar_id?: string | null;
  theme_id?: string | null;
  subtheme_id?: string | null;
};

export default function FrameworkLinkDisplay({
  pillar_id,
  theme_id,
  subtheme_id,
}: FrameworkLinkDisplayProps) {
  const [names, setNames] = useState<{ pillar?: string; theme?: string; subtheme?: string }>({});

  useEffect(() => {
    if (!pillar_id && !theme_id && !subtheme_id) return;
    (async () => {
      const results: any = {};
      if (pillar_id) {
        const { data } = await supabase
          .from("ssc_pillars")
          .select("name")
          .eq("id", pillar_id)
          .maybeSingle();
        results.pillar = data?.name || "";
      }
      if (theme_id) {
        const { data } = await supabase
          .from("ssc_themes")
          .select("name")
          .eq("id", theme_id)
          .maybeSingle();
        results.theme = data?.name || "";
      }
      if (subtheme_id) {
        const { data } = await supabase
          .from("ssc_subthemes")
          .select("name")
          .eq("id", subtheme_id)
          .maybeSingle();
        results.subtheme = data?.name || "";
      }
      setNames(results);
    })();
  }, [pillar_id, theme_id, subtheme_id]);

  if (!pillar_id && !theme_id && !subtheme_id) return null;

  return (
    <div className="text-xs text-gray-500 mt-0.5">
      {names.pillar && <span className="mr-2">Pillar: {names.pillar}</span>}
      {names.theme && <span className="mr-2">Theme: {names.theme}</span>}
      {names.subtheme && <span>Subtheme: {names.subtheme}</span>}
    </div>
  );
}
