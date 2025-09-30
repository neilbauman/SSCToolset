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
 */
export async function replaceFrameworkVersionItems(
  versionId: string,
  items: NormalizedFramework[]
): Promise<void> {
  const rows: any[] = [];
  let sortCounter = 1;

  for (const pillar of items) {
    rows.push({
      version_id: versionId,
      pillar_id: pillar.id,
      theme_id: null,
      subtheme_id: null,
      ref_code: pillar.ref_code ?? `P${sortCounter}`,
      sort_order: sortCounter++,
    });

    for (const theme of pillar.themes ?? []) {
      rows.push({
        version_id: versionId,
        pillar_id: pillar.id,
        theme_id: theme.id,
        subtheme_id: null,
        ref_code: theme.ref_code ?? `T${pillar.ref_code}.${theme.sort_order}`,
        sort_order: sortCounter++,
      });

      for (const sub of theme.subthemes ?? []) {
        rows.push({
          version_id: versionId,
          pillar_id: pillar.id,
          theme_id: theme.id,
          subtheme_id: sub.id,
          ref_code:
            sub.ref_code ??
            `ST${pillar.ref_code}.${theme.sort_order}.${sub.sort_order}`,
          sort_order: sortCounter++,
        });
      }
    }
  }

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
// Remove Items from Version (safe deletes)
// ─────────────────────────────────────────────
export async function removePillarFromVersion(
  versionId: string,
  pillarId: string
) {
  const { error } = await supabaseServer
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId)
    .eq("pillar_id", pillarId);

  if (error) throw new Error(error.message);
}

export async function removeThemeFromVersion(versionId: string, themeId: string) {
  const { error } = await supabaseServer
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId)
    .eq("theme_id", themeId);

  if (error) throw new Error(error.message);
}

export async function removeSubthemeFromVersion(
  versionId: string,
  subthemeId: string
) {
  const { error } = await supabaseServer
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId)
    .eq("subtheme_id", subthemeId);

  if (error) throw new Error(error.message);
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
// Catalogue: Themes
// ─────────────────────────────────────────────
export async function listThemeCatalogue(versionId: string, pillarId: string) {
  const { data, error } = await supabaseServer.rpc("list_theme_catalogue", {
    v_version_id: versionId,
    v_pillar_id: pillarId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTheme(
  pillarId: string,
  name: string,
  description?: string
) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .insert({ pillar_id: pillarId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTheme(
  id: string,
  patch: { name?: string; description?: string }
) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTheme(id: string) {
  const { error } = await supabaseServer
    .from("theme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Catalogue: Subthemes
// ─────────────────────────────────────────────
export async function listSubthemeCatalogue(versionId: string, themeId: string) {
  const { data, error } = await supabaseServer.rpc("list_subtheme_catalogue", {
    v_version_id: versionId,
    v_theme_id: themeId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createSubtheme(
  themeId: string,
  name: string,
  description?: string
) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .insert({ theme_id: themeId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSubtheme(
  id: string,
  patch: { name?: string; description?: string }
) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSubtheme(id: string) {
  const { error } = await supabaseServer
    .from("subtheme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
