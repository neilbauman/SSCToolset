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
  return (data ?? []) as FrameworkVersion[];
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

export async function cloneVersion(
  fromVersionId: string,
  newName: string
): Promise<string> {
  // Uses DB RPC to clone a version; returns new version id
  const { data, error } = await supabaseServer.rpc(
    "clone_framework_version",
    {
      v_from_version_id: fromVersionId,
      v_new_name: newName,
    }
  );
  if (error) throw new Error(error.message);
  // data can be the new id or payload; normalize to string
  if (typeof data === "string") return data;
  if (data?.id) return data.id as string;
  throw new Error("Unexpected clone RPC return");
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

export async function deleteVersion(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from("framework_versions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Framework Tree (via RPC)
// ─────────────────────────────────────────────
export async function getVersionTree(
  versionId: string
): Promise<NormalizedFramework[]> {
  const { data, error } = await supabaseServer.rpc("get_framework_tree", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as NormalizedFramework[];
}

// ─────────────────────────────────────────────
// Catalogue: Pillars / Themes / Subthemes
// ─────────────────────────────────────────────
export async function listPillarCatalogue(versionId: string) {
  const { data, error } = await supabaseServer.rpc("list_pillar_catalogue", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listThemeCatalogue(params: {
  versionId: string;
  pillarId: string;
}) {
  const { data, error } = await supabaseServer.rpc("list_theme_catalogue", {
    v_version_id: params.versionId,
    v_pillar_id: params.pillarId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSubthemeCatalogue(params: {
  versionId: string;
  themeId: string;
}) {
  const { data, error } = await supabaseServer.rpc("list_subtheme_catalogue", {
    v_version_id: params.versionId,
    v_theme_id: params.themeId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPillar(
  name: string,
  description?: string | null
): Promise<{ id: string }> {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .insert({ name, description: description ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function createTheme(
  pillarId: string,
  name: string,
  description?: string | null
): Promise<{ id: string }> {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .insert({
      pillar_id: pillarId,
      name,
      description: description ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function createSubtheme(
  themeId: string,
  name: string,
  description?: string | null
): Promise<{ id: string }> {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .insert({
      theme_id: themeId,
      name,
      description: description ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

// ─────────────────────────────────────────────
// Version Items Replace (delete then insert)
// ─────────────────────────────────────────────
export type VersionItemInsert = {
  version_id: string;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  sort_order: number;
  ref_code: string;
};

export async function replaceFrameworkVersionItems(
  versionId: string,
  items: VersionItemInsert[]
): Promise<void> {
  // 1) Remove existing rows for version
  const { error: delErr } = await supabaseServer
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId);
  if (delErr) throw new Error(delErr.message);

  // 2) Insert new ones (if any)
  if (items.length > 0) {
    const { error: insErr } = await supabaseServer
      .from("framework_version_items")
      .insert(items);
    if (insErr) throw new Error(insErr.message);
  }
}
