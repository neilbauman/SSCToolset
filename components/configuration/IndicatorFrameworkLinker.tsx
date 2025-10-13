"use client";

import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2, Link as LinkIcon, Search } from "lucide-react";

export default function IndicatorFrameworkLinker() {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [framework, setFramework] = useState<any[]>([]);
  const [links, setLinks] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: inds }, { data: fw }, { data: lks }] = await Promise.all([
        supabase.from("indicator_catalogue").select("id,name,description,topic,unit"),
        supabase.from("view_framework_hierarchy").select("*").order("pillar_name,theme_name,subtheme_name"),
        supabase.from("indicator_framework_links").select("*"),
      ]);
      setIndicators(inds || []);
      setFramework(fw || []);
      const map: Record<string, any> = {};
      (lks || []).forEach((l) => (map[l.indicator_id] = l));
      setLinks(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return indicators;
    return indicators.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, indicators]);

  const handleLink = async (indicatorId: string, subthemeId: string) => {
    const f = framework.find((f) => f.subtheme_id === subthemeId);
    if (!f) return;
    setSaving(true);
    await supabase.from("indicator_framework_links").upsert({
      indicator_id: indicatorId,
      pillar_id: f.pillar_id,
      theme_id: f.theme_id,
      subtheme_id: f.subtheme_id,
      confidence: 1,
    });
    setLinks((p) => ({
      ...p,
      [indicatorId]: {
        indicator_id: indicatorId,
        pillar_id: f.pillar_id,
        theme_id: f.theme_id,
        subtheme_id: f.subtheme_id,
      },
    }));
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading indicators…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          className="flex-1 outline-none text-sm"
          placeholder="Search indicators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((ind) => {
          const link = links[ind.id];
          return (
            <div key={ind.id} className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-gray-800 text-sm">{ind.name}</div>
                {link ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500 mb-2">{ind.topic || "—"}</p>
              <p className="text-xs text-gray-500 italic mb-3">{ind.description || "No description."}</p>
              <div className="text-xs text-gray-700">
                <select
                  className="border rounded px-2 py-1 w-full text-xs"
                  onChange={(e) => handleLink(ind.id, e.target.value)}
                  value={link?.subtheme_id || ""}
                  disabled={saving}
                >
                  <option value="">— Select Subtheme —</option>
                  {framework.map((f) => (
                    <option key={f.subtheme_id || f.theme_id} value={f.subtheme_id || ""}>
                      {`${f.pillar_name} / ${f.theme_name} ${f.subtheme_name ? "/ " + f.subtheme_name : ""}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
