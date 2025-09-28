import { supabaseServer } from "@/lib/supabase";

/** ---------------- Types ---------------- */

export type FrameworkVersion = {
  id: string;
  name: string;
  status: string;
  created_at?: string;
};

export type NormalizedFramework = {
  id: string;
  name: string;
  description: string | null;
  ref_code: string;
  sort_order: number;
  themes?: NormalizedFramework[];
  subthemes?: NormalizedFramework[];
};

export type PillarCatalogueRow = {
  id: string;
  name: string;
  description: string | null;
  can_have_indicators: boolean | null;
};

/** ---------------- Framework Tree ---------------- */

export async function getVersionTree(
  versionId: string
): Promise<NormalizedFramework[]> {
  const { data, error } = await supabaseServer.rpc("get_framework_tree", {
    v_version_id: versionId,
  });
  if (error) throw error;
  return (data ?? []) as NormalizedFramework[];
}

/** ---------------- Version Services ---------------- */

export async function createVersion(name: string): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert([{ name, status: "draft" }])
    .select()
    .single();

  if (error) throw error;
  return data as FrameworkVersion;
}

export async function cloneVersion(
  fromVersionId: string,
  name: string
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer.rpc("clone_framework_version", {
    from_version_id: fromVersionId,
    new_name: name,
  });
  if (error) throw error;
  return data as FrameworkVersion;
}

export async function publishVersion(
  versionId: string
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", versionId)
    .select()
    .single();
  if (error) throw error;
  return data as FrameworkVersion;
}

/** ---------------- Pillar Services ---------------- */

export async function createPillar(
  versionId: string,
  opts: {
    existingId?: string;
    name?: string;
    description?: string | null;
    includeChildren?: boolean;
  }
) {
  const { data, error } = await supabaseServer.rpc("add_pillar_to_version", {
    v_version_id: versionId,
    v_existing_id: opts.existingId ?? null,
    v_name: opts.name ?? null,
    v_description: opts.description ?? null,
    v_include_children: opts.includeChildren ?? false,
  });
  if (error) throw error;
  return data;
}

export async function updatePillar(id: string, patch: any) {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePillar(id: string) {
  const { error } = await supabaseServer
    .from("pillar_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** ---------------- Theme Services ---------------- */

export async function createTheme(
  pillarId: string,
  opts: { name: string; description?: string | null }
) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .insert([
      { pillar_id: pillarId, name: opts.name, description: opts.description },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTheme(id: string, patch: any) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTheme(id: string) {
  const { error } = await supabaseServer
    .from("theme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** ---------------- Subtheme Services ---------------- */

export async function createSubtheme(
  themeId: string,
  opts: { name: string; description?: string | null }
) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .insert([
      { theme_id: themeId, name: opts.name, description: opts.description },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubtheme(id: string, patch: any) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubtheme(id: string) {
  const { error } = await supabaseServer
    .from("subtheme_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** ---------------- Catalogue helpers ---------------- */

export async function listPillarCatalogue(): Promise<PillarCatalogueRow[]> {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .select("id, name, description, can_have_indicators") // ✅ fixed, no sort_order
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PillarCatalogueRow[];
}

export async function listThemesByPillar(pillarId: string) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .select("id, name, description, can_have_indicators, sort_order")
    .eq("pillar_id", pillarId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listSubthemesByTheme(themeId: string) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .select("id, name, description, can_have_indicators, sort_order")
    .eq("theme_id", themeId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
