import { supabaseServer } from "@/lib/supabase";
import type {
  FrameworkItem,
  FrameworkVersion,
  NormalizedFramework,
} from "@/lib/types/framework";

/** ---------------- Versions ---------------- */
export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FrameworkVersion[];
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

/** ---------------- Items / Tree ---------------- */

const SELECT_FRAGMENT = `
  id,
  version_id,
  sort_order,
  pillar_id,
  theme_id,
  subtheme_id,
  pillar:pillar_id ( id, name, description, can_have_indicators ),
  theme:theme_id ( id, name, description, can_have_indicators ),
  subtheme:subtheme_id ( id, name, description, can_have_indicators )
`;

export async function getVersionItems(versionId: string): Promise<FrameworkItem[]> {
  async function query(table: string) {
    const { data, error } = await supabaseServer
      .from(table)
      .select(SELECT_FRAGMENT)
      .eq("version_id", versionId)
      .order("sort_order", { ascending: true });

    if (error) throw Object.assign(new Error(error.message), error);
    return (data ?? []) as any[];
  }

  try {
    const rows = await query("framework_version_items");
    return normalizeRows(rows);
  } catch (e: any) {
    const isMissingTable =
      e?.code === "PGRST205" ||
      /Could not find the table/i.test(String(e?.message ?? "")) ||
      /relation .* does not exist/i.test(String(e?.message ?? ""));

    if (!isMissingTable) throw e;

    const rows = await query("framework_items");
    return normalizeRows(rows);
  }
}

function normalizeRows(rows: any[]): FrameworkItem[] {
  return rows.map((row: any) => ({
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

/** normalize items into a nested pillar -> theme -> subtheme tree */
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
        color: null,
        icon: null,
        can_have_indicators: it.pillar?.can_have_indicators ?? false,
        sort_order: it.sort_order ?? undefined,
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
          color: null,
          icon: null,
          can_have_indicators: it.theme?.can_have_indicators ?? false,
          sort_order: it.sort_order ?? undefined,
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
            color: null,
            icon: null,
            can_have_indicators: it.subtheme?.can_have_indicators ?? true,
            sort_order: it.sort_order ?? undefined,
          });
        }
      }
    }
  }

  return Array.from(pillarMap.values());
}

export async function getVersionTree(versionId: string): Promise<NormalizedFramework[]> {
  const items = await getVersionItems(versionId);
  return normalizeFramework(items);
}

/** ---------------- Catalogue helpers ---------------- */

export async function listThemesByPillar(pillarId: string) {
  const { data, error } = await supabaseServer
    .from("theme_catalogue")
    .select("id, name, description, can_have_indicators, sort_order")
    .eq("pillar_id", pillarId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listSubthemesByTheme(themeId: string) {
  const { data, error } = await supabaseServer
    .from("subtheme_catalogue")
    .select("id, name, description, can_have_indicators, sort_order")
    .eq("theme_id", themeId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

/** Utility: generate sort order numbers */
function pillarSortKey(pIdx: number) {
  return pIdx * 1_000_000;
}
function themeSortKey(pIdx: number, tIdx: number) {
  return pIdx * 1_000_000 + tIdx * 1_000;
}
function subthemeSortKey(pIdx: number, tIdx: number, sIdx: number) {
  return pIdx * 1_000_000 + tIdx * 1_000 + sIdx;
}

/** Count distinct pillars already in a version */
async function nextPillarIndex(versionId: string): Promise<number> {
  const { data, error } = await supabaseServer
    .from("framework_version_items")
    .select("pillar_id", { head: false });
  if (error) throw error;

  const distinct = new Set<string>();
  (data ?? []).forEach((row: any) => {
    if (row.pillar_id) distinct.add(row.pillar_id);
  });
  return distinct.size + 1;
}

/** ---------------- Create Pillar (+ optional children) ---------------- */
export async function createPillar(
  versionId: string,
  data: {
    name?: string;
    description?: string;
    existingId?: string;
    includeChildren?: boolean;
  }
) {
  // 1) Resolve/insert pillar in catalogue
  let pillarId = data.existingId as string | undefined;

  if (!pillarId) {
    const { data: newPillar, error } = await supabaseServer
      .from("pillar_catalogue")
      .insert({
        name: data.name,
        description: data.description ?? null,
        can_have_indicators: false,
      })
      .select("id")
      .single();

    if (error) throw error;
    pillarId = newPillar.id;
  }

  // 2) Determine pillar position in this version
  const pIndex = await nextPillarIndex(versionId);

  // 3) Insert pillar item
  const pillarItem = {
    version_id: versionId,
    pillar_id: pillarId,
    theme_id: null,
    subtheme_id: null,
    sort_order: pillarSortKey(pIndex),
    ref_code: `P${pIndex}`,
  };

  const { data: insertedPillar, error: insPillarErr } = await supabaseServer
    .from("framework_version_items")
    .insert(pillarItem)
    .select("*")
    .single();
  if (insPillarErr) throw insPillarErr;

  // 4) Optionally include children
  if (data.includeChildren) {
    const themes = await listThemesByPillar(pillarId!);

    const themeRows: any[] = [];
    const subRows: any[] = [];

    themes.forEach((t: any, tIdx: number) => {
      const themeIndex = tIdx + 1;
      themeRows.push({
        version_id: versionId,
        pillar_id: pillarId,
        theme_id: t.id,
        subtheme_id: null,
        sort_order: themeSortKey(pIndex, themeIndex),
        ref_code: `P${pIndex}.T${themeIndex}`,
      });
    });

    for (let tIdx = 0; tIdx < themes.length; tIdx++) {
      const t = themes[tIdx];
      const themeIndex = tIdx + 1;
      const subthemes = await listSubthemesByTheme(t.id);
      subthemes.forEach((s: any, sIdx: number) => {
        const subIndex = sIdx + 1;
        subRows.push({
          version_id: versionId,
          pillar_id: pillarId,
          theme_id: t.id,
          subtheme_id: s.id,
          sort_order: subthemeSortKey(pIndex, themeIndex, subIndex),
          ref_code: `P${pIndex}.T${themeIndex}.S${subIndex}`,
        });
      });
    }

    if (themeRows.length) {
      const { error: themeErr } = await supabaseServer
        .from("framework_version_items")
        .insert(themeRows);
      if (themeErr) throw themeErr;
    }
    if (subRows.length) {
      const { error: subErr } = await supabaseServer
        .from("framework_version_items")
        .insert(subRows);
      if (subErr) throw subErr;
    }
  }

  return insertedPillar;
}
