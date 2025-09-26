// lib/services/framework.ts
import { supabaseServer } from "@/lib/services/supabaseServer";

/**
 * List all framework versions (name, id, created_at).
 */
export async function listVersions() {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Create a new draft version from the catalogue (server-side).
 * Accepts a name (required by your POST route).
 */
export async function createDraftFromCatalogue(name: string) {
  // Insert a new version row in "draft" status.
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select("id, name, created_at, status")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Publish an existing version.
 */
export async function publishVersion(id: string) {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", id)
    .select("id, name, created_at, status")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Flat structure for a version (items joined with catalogue names/descriptions),
 * ordered by sort_order. This matches the UI need (table + expand).
 */
export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseServer
    .from("framework_version_items")
    .select(`
      id,
      version_id,
      sort_order,
      pillar_id,
      theme_id,
      subtheme_id,
      pillar:pillar_catalogue(name, description),
      theme:theme_catalogue(name, description, pillar_id),
      subtheme:subtheme_catalogue(name, description, theme_id)
    `)
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  // Normalize row -> { type, code, name, description, sort_order, ... }
  const normalized = (data ?? []).map((row: any) => {
    const so: number = row.sort_order;
    const isPillar = row.theme_id == null && row.subtheme_id == null;
    const isTheme = row.theme_id != null && row.subtheme_id == null;
    const isSub   = row.subtheme_id != null;

    // Ref code rules (P#, T#.#, ST#.#.#) — computed from sort_order
    const pIdx = Math.floor(so / 1_000_000);
    const tIdx = Math.floor((so % 1_000_000) / 1_000);
    const sIdx = so % 1_000;

    let type = "pillar";
    let ref = `P${pIdx}`;
    let name = row.pillar?.[0]?.name ?? "Untitled";
    let description = row.pillar?.[0]?.description ?? null;

    if (isTheme) {
      type = "theme";
      ref = `T${pIdx}.${tIdx}`;
      name = row.theme?.[0]?.name ?? "Untitled";
      description = row.theme?.[0]?.description ?? null;
    } else if (isSub) {
      type = "subtheme";
      ref = `ST${pIdx}.${tIdx}.${sIdx}`;
      name = row.subtheme?.[0]?.name ?? "Untitled";
      description = row.subtheme?.[0]?.description ?? null;
    }

    return {
      id: row.id,
      version_id: row.version_id,
      type,
      ref_code: ref,
      name,
      description,
      sort_order: so,
      pillar_id: row.pillar_id,
      theme_id: row.theme_id,
      subtheme_id: row.subtheme_id,
    };
  });

  return normalized;
}
