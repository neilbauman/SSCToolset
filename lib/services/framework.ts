// lib/services/framework.ts
import { supabase } from "../supabaseClient";
import type {
  FrameworkItem,
  FrameworkVersion,
  NormalizedFramework,
} from "../types/framework";

/**
 * Load all items for a framework version
 */
export async function loadFrameworkVersionItems(
  versionId: string
): Promise<FrameworkItem[]> {
  const { data, error } = await supabase
    .from("framework_version_items")
    .select(
      `
      id,
      version_id,
      sort_order,
      ref_code,
      pillar: pillar_id (
        id, name, description, color, icon, can_have_indicators
      ),
      theme: theme_id (
        id, name, description, color, icon, can_have_indicators
      ),
      subtheme: subtheme_id (
        id, name, description, color, icon, can_have_indicators
      )
    `
    )
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data as FrameworkItem[];
}

/**
 * Replace all framework_version_items for a version
 */
export async function replaceFrameworkVersionItems(
  versionId: string,
  items: NormalizedFramework[]
): Promise<void> {
  // Flatten tree into rows for `framework_version_items`
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
            sub.ref_code ?? `ST${pillar.ref_code}.${theme.sort_order}.${sub.sort_order}`,
          sort_order: sortCounter++,
        });
      }
    }
  }

  // Delete old items
  const { error: delError } = await supabase
    .from("framework_version_items")
    .delete()
    .eq("version_id", versionId);

  if (delError) throw new Error(delError.message);

  // Insert new
  if (rows.length > 0) {
    const { error: insError } = await supabase
      .from("framework_version_items")
      .insert(rows);

    if (insError) throw new Error(insError.message);
  }
}
