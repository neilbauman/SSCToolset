// lib/services/framework.ts
import { supabaseBrowser } from "./supabaseBrowser";

export async function listVersions() {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createDraftFromCatalogue(name: string) {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .insert([{ name, status: "draft" }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishVersion(id: string) {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseBrowser
    .from("framework_version_items")
    .select(
      `
      id,
      version_id,
      sort_order,
      pillar_id,
      theme_id,
      subtheme_id,
      pillar:pillar_id (
        name,
        description
      ),
      theme:theme_id (
        name,
        description
      ),
      subtheme:subtheme_id (
        name,
        description
      )
    `
    )
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}
