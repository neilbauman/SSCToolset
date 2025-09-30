// lib/services/framework.ts
import { supabaseServer } from "@/lib/supabase";
import type {
  FrameworkVersion,
  NormalizedFramework,
  CataloguePillar,
  CatalogueTheme,
  CatalogueSubtheme,
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

export async function cloneVersion(
  fromVersionId: string,
  newName: string
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer.rpc("clone_framework_version", {
    v_from_version_id: fromVersionId,
    v_new_name: newName,
  });
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
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
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
}

export async function deleteVersion(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from("framework_versions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Framework Items (Tree Loader via RPC)
// ─────────────────────────────────────────────
export async function getFrameworkTree(
  versionId: string
): Promise<NormalizedFramework[]> {
  const { data, error } = await supabaseServer.rpc("get_framework_tree", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data as NormalizedFramework[];
}

/**
 * Replace all items in framework_version_items for a version.
 */
export async function replaceFrameworkVersionItems(
  versionId: string,
  tree: NormalizedFramework[]
): Promise<void> {
  const rows: any[] = [];

  function walk(node: NormalizedFramework, parentRef?: string) {
    const { id, type, sort_order, ref_code, themes, subthemes } = node;

    let generatedRef = ref_code;
    if (!generatedRef) {
      if (type === "pillar") generatedRef = `P${sort_order}`;
      if (type === "theme") generatedRef = `T${parentRef}.${sort_order}`;
      if (type === "subtheme") generatedRef = `ST${parentRef}.${sort_order}`;
    }

    rows.push({
      version_id: versionId,
      pillar_id: type === "pillar" ? id : null,
      theme_id: type === "theme" ? id : null,
      subtheme_id: type === "subtheme" ? id : null,
      ref_code: generatedRef,
      sort_order,
    });

    if (type === "pillar" && themes) {
      for (const theme of themes) walk(theme, generatedRef);
    }
    if (type === "theme" && subthemes) {
      for (const sub of subthemes) walk(sub, generatedRef);
    }
  }

  for (const pillar of tree) {
    walk(pillar);
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
// Catalogue: Pillars
// ─────────────────────────────────────────────
export async function listPillarCatalogue(
  versionId: string
): Promise<CataloguePillar[]> {
  const { data, error } = await supabaseServer.rpc("list_pillar_catalogue", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data as CataloguePillar[];
}

export async function createPillar(
  name: string,
  description?: string
): Promise<CataloguePillar> {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CataloguePillar;
}

export async function updatePillar(
  id: string,
  patch: { name?: string; description?: string }
): Promise<CataloguePillar> {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CataloguePillar;
}

export async function deletePillar(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from("pillar_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Catalogue: Themes
// ─────────────────────────────────────────────
export async function listThemeCatalogue(
  versionId: string,
  pillarId: string
): Promise<CatalogueTheme[]> {
  const { data, error } = await supabaseServer.rpc("list_theme_catalogue", {
    v_version_id: versionId,
    v_pillar_id: pillarId,
  });
  if (error) throw new Error(error.message);
  return data as CatalogueTheme[];
}

export async function createTheme(
  pillarId: string,
  name: string,
  description?: string
): Promise<CatalogueTheme> {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .insert({ pillar_id: pillarId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogueTheme;
}

export async function updateTheme(
  id: string,
  patch: { name?: string; description?: string }
): Promise<CatalogueTheme> {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogueTheme;
}

export async function deleteTheme(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from("theme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Catalogue: Subthemes
// ─────────────────────────────────────────────
export async function listSubthemeCatalogue(
  versionId: string,
  themeId: string
): Promise<CatalogueSubtheme[]> {
  const { data, error } = await supabaseServer.rpc("list_subtheme_catalogue", {
    v_version_id: versionId,
    v_theme_id: themeId,
  });
  if (error) throw new Error(error.message);
  return data as CatalogueSubtheme[];
}

export async function createSubtheme(
  themeId: string,
  name: string,
  description?: string
): Promise<CatalogueSubtheme> {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .insert({ theme_id: themeId, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogueSubtheme;
}

export async function updateSubtheme(
  id: string,
  patch: { name?: string; description?: string }
): Promise<CatalogueSubtheme> {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogueSubtheme;
}

export async function deleteSubtheme(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from("subtheme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Backwards Compatibility Aliases
// ─────────────────────────────────────────────
export const getVersionTree = getFrameworkTree;
