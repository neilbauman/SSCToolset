import { supabaseBrowser } from "@/lib/services/supabaseBrowser";

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

  // Normalize into flat JSON with names/descriptions
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
