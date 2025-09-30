// lib/services/framework.ts
import { supabaseServer } from "@/lib/supabase";
import type {
  FrameworkVersion,
  NormalizedFramework,
} from "@/lib/types/framework";

// ─────────────────────────────────────────────
// Framework Versions
// ─────────────────────────────────────────────
export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("id, name, status, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FrameworkVersion[];
}

export async function createVersion(name: string): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
}

export async function cloneVersion(fromVersionId: string, newName: string) {
  const { data, error } = await supabaseServer.rpc("clone_framework_version", {
    v_from_version_id: fromVersionId,
    v_new_name: newName,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function publishVersion(
  versionId: string,
  publish: boolean
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update({ status: publish ? "published" : "draft" })
    .eq("id", versionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
}

export async function updateVersion(
  id: string,
  patch: { name?: string; status?: string }
) {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVersion(id: string) {
  const { error } = await supabaseServer
    .from("framework_versions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Framework Items (Tree Loader via RPC)
// ─────────────────────────────────────────────
export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseServer.rpc("get_framework_tree", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data as NormalizedFramework[];
}

/**
 * Replace all items in framework_version_items for a version
 * - sort_order is per parent (1..N for pillars, themes-in-pillar, subthemes-in-theme)
 * - ref_code formats: P#, T#.#, ST#.#.#
 */
export async function replaceFrameworkVersionItems(
  versionId: string,
  items: NormalizedFramework[]
): Promise<void> {
  const rows: any[] = [];

  for (let pIdx = 0; pIdx < items.length; pIdx++) {
    const pillar = items[pIdx];

    // Pillar row
    rows.push({
      version_id: versionId,
      pillar_id: pillar.id,
      theme_id: null,
      subtheme_id: null,
      ref_code: `P${pIdx + 1}`,
      sort_order: pIdx + 1, // per parent: pillar index
    });

    const themes = pillar.themes ?? [];
    for (let tIdx = 0; tIdx < themes.length; tIdx++) {
      const theme = themes[tIdx];

      rows.push({
        version_id: versionId,
        pillar_id: pillar.id,
        theme_id: theme.id,
        subtheme_id: null,
        ref_code: `T${pIdx + 1}.${tIdx + 1}`,
        sort_order: tIdx + 1, // per parent: theme index within pillar
      });

      const subs = theme.subthemes ?? [];
      for (let sIdx = 0; sIdx < subs.length; sIdx++) {
        const sub = subs[sIdx];

        rows.push({
          version_id: versionId,
          pillar_id: pillar.id,
          theme_id: theme.id,
          subtheme_id: sub.id,
          ref_code: `ST${pIdx + 1}.${tIdx + 1}.${sIdx + 1}`,
          sort_order: sIdx + 1, // per parent: subtheme index within theme
        });
      }
    }
  }

  // replace all rows
  const { error: delError } = await supabaseServer
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId);
  if (delError) throw new Error(delError.message);

  if (rows.length > 0) {
    const { error: insError } = await supabaseServer
      .from("framework_version_items")
      .insert(rows);
    if (insError) throw new Error(insError.message);
  }
}

// ─────────────────────────────────────────────
// Catalogue: Pillars
// ─────────────────────────────────────────────
export async function listPillarCatalogue(versionId: string) {
  const { data, error } = await supabaseServer.rpc("list_pillar_catalogue", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createPillar(name: string, description?: string) {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePillar(
  id: string,
  patch: { name?: string; description?: string }
) {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePillar(id: string) {
  const { error } = await supabaseServer
    .from("pillar_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Catalogue: Themes/Subthemes
// (you already have listThemeCatalogue / listSubthemeCatalogue / createTheme / createSubtheme)
// ─────────────────────────────────────────────
export async function listThemeCatalogue(versionId: string, pillarId: string) {
  const { data, error } = await supabaseServer.rpc("list_theme_catalogue", {
    v_version_id: versionId,
    v_pillar_id: pillarId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function listSubthemeCatalogue(versionId: string, themeId: string) {
  const { data, error } = await supabaseServer.rpc("list_subtheme_catalogue", {
    v_version_id: versionId,
    v_theme_id: themeId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTheme(pillarId: string, name: string, description?: string) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .insert({ pillar_id: pillarId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSubtheme(themeId: string, name: string, description?: string) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .insert({ theme_id: themeId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
