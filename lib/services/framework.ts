import { supabaseServer } from "./supabaseServer";
import { refCode, sortKey } from "@/lib/domain/framework";
import type { FrameworkVersion, VersionTreeNode } from "@/lib/types/framework";

export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as any;
}

export async function createDraftFromCatalogue(name: string) {
  // 1) Read catalogues
  const [{ data: pillars }, { data: themes }, { data: subthemes }] = await Promise.all([
    supabaseServer.from("pillar_catalogue").select("*").order("name"),
    supabaseServer.from("theme_catalogue").select("*").order("name"),
    supabaseServer.from("subtheme_catalogue").select("*").order("name"),
  ]);
  if (!pillars || !themes || !subthemes) throw new Error("Missing catalogue data");

  // 2) Create version
  const { data: version, error: vErr } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select()
    .single();
  if (vErr) throw vErr;

  // 3) Build flattened items with ref codes + sort order
  const items: any[] = [];
  pillars.forEach((p: any, pi: number) => {
    const pThemes = themes.filter((t: any) => t.pillar_id === p.id);
    if (pThemes.length === 0) {
      items.push({
        version_id: version.id,
        pillar_id: p.id,
        theme_id: null,
        subtheme_id: null,
        ref_code: refCode(pi),
        sort_order: sortKey(pi),
      });
      return;
    }
    pThemes.forEach((t: any, ti: number) => {
      const tSubs = subthemes.filter((s: any) => s.theme_id === t.id);
      if (tSubs.length === 0) {
        items.push({
          version_id: version.id,
          pillar_id: p.id,
          theme_id: t.id,
          subtheme_id: null,
          ref_code: refCode(pi, ti),
          sort_order: sortKey(pi, ti),
        });
        return;
      }
      tSubs.forEach((s: any, si: number) => {
        items.push({
          version_id: version.id,
          pillar_id: p.id,
          theme_id: t.id,
          subtheme_id: s.id,
          ref_code: refCode(pi, ti, si),
          sort_order: sortKey(pi, ti, si),
        });
      });
    });
  });

  // 4) Insert items
  const { error: iErr } = await supabaseServer.from("framework_version_items").insert(items);
  if (iErr) throw iErr;

  return version;
}

export async function publishVersion(id: string) {
  const { error } = await supabaseServer
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", id);
  if (error) throw error;
}

export async function getVersionTree(versionId: string): Promise<VersionTreeNode[]> {
  const [{ data: items }, { data: pillars }, { data: themes }, { data: subthemes }] = await Promise.all([
    supabaseServer
      .from("framework_version_items")
      .select("*")
      .eq("version_id", versionId)
      .order("sort_order", { ascending: true }),
    supabaseServer.from("pillar_catalogue").select("*"),
    supabaseServer.from("theme_catalogue").select("*"),
    supabaseServer.from("subtheme_catalogue").select("*"),
  ]);
  if (!items || !pillars || !themes || !subthemes) throw new Error("Failed to load version items");

  // Build by catalogue ids present in items
  const pMap = new Map(pillars.map((p: any) => [p.id, p]));
  const tMap = new Map(themes.map((t: any) => [t.id, t]));
  const sMap = new Map(subthemes.map((s: any) => [s.id, s]));

  const tree = new Map<string, { pillar: any; themes: Map<string, { theme: any; subthemes: any[] }> }>();

  for (const it of items) {
    const p = it.pillar_id ? pMap.get(it.pillar_id) : null;
    const t = it.theme_id ? tMap.get(it.theme_id) : null;
    const s = it.subtheme_id ? sMap.get(it.subtheme_id) : null;

    if (!p) continue; // we expect pillar for meaningful structure

    if (!tree.has(p.id)) tree.set(p.id, { pillar: p, themes: new Map() });

    if (t) {
      const entry = tree.get(p.id)!;
      if (!entry.themes.has(t.id)) entry.themes.set(t.id, { theme: t, subthemes: [] });
      if (s) {
        entry.themes.get(t.id)!.subthemes.push(s);
      }
    }
  }

  return Array.from(tree.values()).map(v => ({
    pillar: v.pillar,
    themes: Array.from(v.themes.values())
  }));
}
