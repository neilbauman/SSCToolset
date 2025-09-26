import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Utility: generate ref code from sort order & type
function generateRefCode(sortOrder: number, type: string): string {
  if (type === "pillar") return `P${sortOrder}`;
  if (type === "theme") return `T${sortOrder}`;
  if (type === "subtheme") return `ST${sortOrder}`;
  return `X${sortOrder}`;
}

export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseBrowser
    .from("framework_version_items")
    .select(`
      id,
      version_id,
      sort_order,
      pillar_id,
      pillar_name:pillar_catalogue(name, description),
      theme_id,
      theme_name:theme_catalogue(name, description),
      subtheme_id,
      subtheme_name:subtheme_catalogue(name, description)
    `)
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => {
    let type = "pillar";
    let name = row.pillar_name?.[0]?.name || "Untitled";
    let description = row.pillar_name?.[0]?.description || "";

    if (row.theme_id) {
      type = "theme";
      name = row.theme_name?.[0]?.name || "Untitled";
      description = row.theme_name?.[0]?.description || "";
    }
    if (row.subtheme_id) {
      type = "subtheme";
      name = row.subtheme_name?.[0]?.name || "Untitled";
      description = row.subtheme_name?.[0]?.description || "";
    }

    return {
      id: row.id,
      version_id: row.version_id,
      sort_order: row.sort_order,
      ref_code: generateRefCode(row.sort_order, type),
      type,
      name,
      description,
    };
  });
}
