import { supabaseServer } from "@/lib/supabase";
import type {
  FrameworkItem,
  FrameworkVersion,
  NormalizedFramework,
} from "@/lib/types/framework";

export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createDraftFromCatalogue(
  name: string
): Promise<FrameworkVersion> {
  const { data: rpcData, error: rpcError } = await supabaseServer
    .rpc("duplicate_from_catalogue", { name_in: name })
    .single();

  if (!rpcError && rpcData) return rpcData as FrameworkVersion;

  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select("*")
    .single();

  if (error) throw error;
  return data as FrameworkVersion;
}

export async function getVersionItems(
  versionId: string
): Promise<FrameworkItem[]> {
  const { data, error } = await supabaseServer
    .from("framework_items")
    .select(
      `
      id,
      version_id,
      sort_order,
      pillar_id,
      theme_id,
      subtheme_id,
      pillar:pillar_id ( id, name, description, color, icon ),
      theme:theme_id ( id, name, description, color, icon ),
      subtheme:subtheme_id ( id, name, description, color, icon )
    `
    )
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  // 🔑 Normalize Supabase response into FrameworkItem[]
  return (data ?? []).map((row: any) => ({
    id: row.id,
    version_id: row.version_id,
    sort_order: row.sort_order,
    pillar_id: row.pillar_id,
    theme_id: row.theme_id,
    subtheme_id: row.subtheme_id,
    pillar: Array.isArray(row.pillar) ? row.pillar[0] ?? null : row.pillar,
    theme: Array.isArray(row.theme) ? row.theme[0] ?? null : row.theme,
    subtheme: Array.isArray(row.subtheme) ? row.subtheme[0] ?? null : row.subtheme,
  })) as FrameworkItem[];
}

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
      let theme = pillar.themes.find((t) => t.id === (it.theme?.id ?? it.theme_id!));
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
        if (!theme.subthemes.some((s) => s.id === sid)) {
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

export async function getVersionTree(
  versionId: string
): Promise<NormalizedFramework[]> {
  const items = await getVersionItems(versionId);
  return normalizeFramework(items);
}
