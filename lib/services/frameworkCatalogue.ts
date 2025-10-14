import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type SortItem = { id: string; sort_order: number };

export async function listCatalogueTree() {
  // Pull ordered pillars -> themes -> subthemes
  const { data: pillars, error: pErr } = await supabase
    .from("pillar_catalogue")
    .select("id, code, name, description, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (pErr || !pillars) return [];

  const { data: themes, error: tErr } = await supabase
    .from("theme_catalogue")
    .select("id, pillar_id, code, name, description, sort_order")
    .order("pillar_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  const { data: subs, error: sErr } = await supabase
    .from("subtheme_catalogue")
    .select("id, theme_id, code, name, description, sort_order")
    .order("theme_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (tErr || sErr) {
    console.error(tErr || sErr);
  }

  const themesByPillar: Record<string, any[]> = {};
  for (const t of themes || []) {
    if (!themesByPillar[t.pillar_id]) themesByPillar[t.pillar_id] = [];
    themesByPillar[t.pillar_id].push({ ...t, subthemes: [] });
  }

  const subsByTheme: Record<string, any[]> = {};
  for (const s of subs || []) {
    if (!subsByTheme[s.theme_id]) subsByTheme[s.theme_id] = [];
    subsByTheme[s.theme_id].push(s);
  }

  // attach subthemes into themes
  for (const t of themes || []) {
    const container = themesByPillar[t.pillar_id]?.find((x: any) => x.id === t.id);
    if (container) container.subthemes = subsByTheme[t.id] || [];
  }

  // attach themes into pillars
  return (pillars || []).map((p) => ({
    ...p,
    themes: themesByPillar[p.id] || [],
  }));
}

// ---- Pillars ----
export async function createPillar(payload: { code: string; name: string; description: string }) {
  // determine next sort_order
  const { data: max } = await supabase
    .from("pillar_catalogue")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const nextOrder = (max?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("pillar_catalogue")
    .insert([{ ...payload, sort_order: nextOrder }])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Failed to create pillar.");
    return null;
  }
  return data;
}

export async function updatePillar(id: string, patch: Partial<{ code: string; name: string; description: string }>) {
  const { error } = await supabase.from("pillar_catalogue").update(patch).eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to update pillar.");
  }
}

export async function deletePillar(id: string) {
  // delete child themes + subthemes via CASCADE or do manual cleanup if needed
  const { error } = await supabase.from("pillar_catalogue").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to delete pillar.");
  }
}

export async function setPillarOrder(items: SortItem[]) {
  const updates = items.map((i) => supabase.from("pillar_catalogue").update({ sort_order: i.sort_order }).eq("id", i.id));
  await Promise.all(updates);
}

// ---- Themes ----
export async function createTheme(pillarId: string, payload: { code: string; name: string; description: string }) {
  const { data: max } = await supabase
    .from("theme_catalogue")
    .select("sort_order")
    .eq("pillar_id", pillarId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const nextOrder = (max?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("theme_catalogue")
    .insert([{ pillar_id: pillarId, ...payload, sort_order: nextOrder }]);

  if (error) {
    console.error(error);
    alert("Failed to create theme.");
  }
}

export async function updateTheme(id: string, patch: Partial<{ code: string; name: string; description: string }>) {
  const { error } = await supabase.from("theme_catalogue").update(patch).eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to update theme.");
  }
}

export async function deleteTheme(id: string) {
  const { error } = await supabase.from("theme_catalogue").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to delete theme.");
  }
}

export async function setThemeOrder(pillarId: string, items: SortItem[]) {
  const updates = items.map((i) => supabase.from("theme_catalogue").update({ sort_order: i.sort_order }).eq("id", i.id).eq("pillar_id", pillarId));
  await Promise.all(updates);
}

// ---- Subthemes ----
export async function createSubtheme(themeId: string, payload: { code: string; name: string; description: string }) {
  const { data: max } = await supabase
    .from("subtheme_catalogue")
    .select("sort_order")
    .eq("theme_id", themeId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const nextOrder = (max?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("subtheme_catalogue")
    .insert([{ theme_id: themeId, ...payload, sort_order: nextOrder }]);

  if (error) {
    console.error(error);
    alert("Failed to create subtheme.");
  }
}

export async function updateSubtheme(id: string, patch: Partial<{ code: string; name: string; description: string }>) {
  const { error } = await supabase.from("subtheme_catalogue").update(patch).eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to update subtheme.");
  }
}

export async function deleteSubtheme(id: string) {
  const { error } = await supabase.from("subtheme_catalogue").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Failed to delete subtheme.");
  }
}

export async function setSubthemeOrder(themeId: string, items: SortItem[]) {
  const updates = items.map((i) => supabase.from("subtheme_catalogue").update({ sort_order: i.sort_order }).eq("id", i.id).eq("theme_id", themeId));
  await Promise.all(updates);
}
