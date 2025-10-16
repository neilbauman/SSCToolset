"use server";

import { supabaseServer as supabase } from "@/lib/supabase/supabaseServer"; // falls back to your server client
// If you only have a browser client, switch import to supabaseBrowser. Writes are fine from client if RLS permits.

export type DatasetType = "adm0" | "gradient" | "categorical";

export type MetaInput = {
  title: string;
  country_iso: string;
  admin_level: string;         // "ADM0" | "ADM1" | "ADM2" | "ADM3"
  data_type: string;           // "numeric" | "percentage" | "categorical"
  data_format: string | null;  // "numeric" | "text" | null
  dataset_type: DatasetType;   // adm0 | gradient | categorical
  year: number | null;
  unit: string | null;
  upload_type?: string | null; // "csv" | "xlsx" | "manual"
  join_field?: string | null;
  indicator_id?: string | null;
  theme?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  source?: string | null;
  description?: string | null;
};

export type GradientRow = {
  admin_pcode: string;
  admin_level: string; // echo meta.admin_level
  value: number;
  unit?: string | null;
};

export type Adm0Row = {
  admin_pcode: "ADM0";
  admin_level: "ADM0" | null | string;
  value: number;
  unit?: string | null;
};

export type CategoryMapItem = {
  code: string;   // stable code (use label when code missing)
  label: string;  // human-facing
  score: number | null; // nullable
};

export type CategoricalRow = {
  admin_pcode: string;
  admin_level: string;
  category_code: string;
  category_label: string;
  category_score: number | null;
};

export async function saveDataset(
  meta: MetaInput,
  rows: (GradientRow | Adm0Row | CategoricalRow)[],
  categoryMap?: CategoryMapItem[]
): Promise<{ dataset_id: string }> {
  // 1) Insert metadata first
  const { data: metaInsert, error: metaErr } = await supabase
    .from("dataset_metadata")
    .insert([
      {
        title: meta.title,
        country_iso: meta.country_iso,
        admin_level: meta.admin_level,
        data_type: meta.data_type,
        data_format: meta.data_format,
        dataset_type: meta.dataset_type,
        year: meta.year,
        unit: meta.unit,
        upload_type: meta.upload_type ?? null,
        join_field: meta.join_field ?? null,
        indicator_id: meta.indicator_id ?? null,
        theme: meta.theme ?? null,
        source_name: meta.source_name ?? null,
        source_url: meta.source_url ?? null,
        source: meta.source ?? null,
        description: meta.description ?? null,
        record_count: Array.isArray(rows) ? rows.length : 0,
      },
    ])
    .select("*")
    .single();

  if (metaErr) {
    throw new Error(`Failed to insert dataset_metadata: ${metaErr.message}`);
  }

  const dataset_id = metaInsert.id as string;

  // 2) Insert values by dataset_type
  if (meta.dataset_type === "adm0" || meta.dataset_type === "gradient") {
    const valuesRows = (rows as (GradientRow | Adm0Row)[]).map((r) => ({
      dataset_id,
      admin_pcode: r.admin_pcode,
      admin_level: r.admin_level ?? meta.admin_level,
      value: r.value,
      unit: r.unit ?? meta.unit ?? null,
    }));

    const { error: valErr } = await supabase.from("dataset_values").insert(valuesRows);
    if (valErr) {
      throw new Error(`Failed to insert dataset_values: ${valErr.message}`);
    }
  } else if (meta.dataset_type === "categorical") {
    // optional: category map first
    if (categoryMap && categoryMap.length > 0) {
      const mapRows = categoryMap.map((m) => ({
        dataset_id,
        code: m.code || m.label,
        label: m.label,
        score: m.score ?? null,
      }));
      const { error: mapErr } = await supabase
        .from("dataset_category_maps")
        .insert(mapRows);
      if (mapErr) {
        throw new Error(`Failed to insert dataset_category_maps: ${mapErr.message}`);
      }
    }

    const catRows = (rows as CategoricalRow[]).map((r) => ({
      dataset_id,
      admin_pcode: r.admin_pcode,
      admin_level: r.admin_level ?? meta.admin_level,
      category_code: r.category_code || r.category_label,
      category_label: r.category_label,
      category_score: r.category_score ?? null,
    }));

    const { error: catErr } = await supabase
      .from("dataset_values_cat")
      .insert(catRows);
    if (catErr) {
      throw new Error(`Failed to insert dataset_values_cat: ${catErr.message}`);
    }
  }

  return { dataset_id };
}
