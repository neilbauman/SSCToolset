// lib/services/framework.ts
import { supabaseBrowser } from "./supabaseBrowser";

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
        name:pillar_name,
        description:pillar_description
      ),
      theme:theme_id (
        name:theme_name,
        description:theme_description
      ),
      subtheme:subtheme_id (
        name:subtheme_name,
        description:subtheme_description
      )
    `
    )
    .eq("version_id", versionId);

  if (error) throw error;

  return data || [];
}
