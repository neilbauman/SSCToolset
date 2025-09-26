// lib/services/framework.ts
import { supabaseServer } from "@/lib/supabase";
import type { FrameworkItem, FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";

/**
 * Get list of framework versions (server-safe)
 */
export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Duplicate from catalogue into a new draft version.
 * This assumes a DB function or we do it procedurally.
 * Here we call an RPC "duplicate_from_catalogue" if present;
 * otherwise we create an empty draft.
 */
export async function createDraftFromCatalogue(name: string): Promise<FrameworkVersion> {
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabaseServer
    .rpc("duplicate_from_catalogue", { name_in: name })
    .single();

  if (!rpcError && rpcData) return rpcData as FrameworkVersion;

  // Fallback: create empty draft
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select("*")
    .single();
  if (error) throw error;
  return data as FrameworkVersion;
}

/**
 * Flat join of items for a version with pillar/theme/subtheme info.
 */
export async function getVersionItems(versionId: string): Promise<FrameworkItem[]> {
  const { data, error } = await supabaseServer
    .from("framework_items")
    .select(`
      id,
      version_id,
      sort_order,
      pillar_id,
      theme_id,
      subtheme_id,
      pillar:pillar_id ( id, name, description, color, icon ),
      theme:theme_id ( id, name, description, color, icon ),
      subtheme:subtheme_id ( id, name, description, color, icon )
    `)
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FrameworkItem[];
}

/**
 * Normalize flat items into Pillar -> Theme -> Subtheme
 */
export function normalizeFramework(items: FrameworkItem[]): NormalizedFramework[] {
  const pillarMap = new Map<string, NormalizedFramework>();
  for (const it of items) {
    if (!it.pillar && !it.pillar_id) continue;

    const pid = it.pillar?.id ?? it.pillar_id!;
    let pillar = pillarMap.get(pid);
    if (!pillar) {
      pillar = {
        id: pid,
        name: it.pillar?.name ?? "",
        description: it.pillar?.description ?? "",
        color: it.pillar?.color ?? null,
        icon: it.pillar?.icon ?? null,
        themes: [],
      };
      pillarMap.set(pid, pillar);
    }

    if (it.theme_id) {
      let theme = pillar.themes.find(t => t.id === (it.theme?.id ?? it.theme_id!));
      if (!theme) {
        theme = {
          id: it.theme?.id ?? it.theme_id!,
          name: it.theme?.name ?? "",
          description: it.theme?.description ?? "",
          color: it.theme?.color ?? null,
          icon: it.theme?.icon ?? null,
          subthemes: [],
        };
        pillar.themes.push(theme);
      }

      if (it.subtheme_id) {
        const sid = it.subtheme?.id ?? it.subtheme_id;
        if (!theme.subthemes.some(s => s.id === sid)) {
          theme.subthemes.push({
            id: sid!,
            name: it.subtheme?.name ?? "",
            description: it.subtheme?.description ?? "",
            color: it.subtheme?.color ?? null,
            icon: it.subtheme?.icon ?? null,
          });
        }
      }
    }
  }
  return Array.from(pillarMap.values());
}

/**
 * Helper: Get normalized tree
 */
export async function getVersionTree(versionId: string): Promise<NormalizedFramework[]> {
  const items = await getVersionItems(versionId);
  return normalizeFramework(items);
}
