import { supabaseBrowser } from "@/lib/services/supabaseBrowser";

/**
 * Fetch a version tree with pillars, themes, subthemes, names & descriptions
 */
export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseBrowser
    .from("framework_version_items")
    .select(`
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
    `)
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching version tree:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    version_id: item.version_id,
    sort_order: item.sort_order,
    pillar_id: item.pillar_id,
    pillar_name: item.pillar?.name || null,
    pillar_description: item.pillar?.description || null,
    theme_id: item.theme_id,
    theme_name: item.theme?.name || null,
    theme_description: item.theme?.description || null,
    subtheme_id: item.subtheme_id,
    subtheme_name: item.subtheme?.name || null,
    subtheme_description: item.subtheme?.description || null,
  }));
}

/**
 * List framework versions
 */
export async function listVersions() {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing versions:", error);
    throw error;
  }

  return data || [];
}

/**
 * Publish a framework version
 */
export async function publishVersion(versionId: string) {
  const { error } = await supabaseBrowser
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", versionId);

  if (error) {
    console.error("Error publishing version:", error);
    throw error;
  }

  return { success: true };
}

/**
 * Create a draft version from the catalogue
 */
export async function createDraftFromCatalogue() {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .insert([{ status: "draft" }])
    .select()
    .single();

  if (error) {
    console.error("Error creating draft:", error);
    throw error;
  }

  return data;
}
