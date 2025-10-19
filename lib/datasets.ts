// /lib/datasets.ts
// -----------------------------------------------------------------------------
// Unified front-end adapter for the get-country-datasets Edge Function.
// Provides a simple, typed interface for retrieving all datasets relevant to a country.

export type DatasetInfo = {
  id: string;
  title: string;
  dataset_type: "admin" | "population" | "gis" | "derived" | "other" | string;
  join_field: string;
  source_table: string;
  admin_level: string | null;
  data_format?: string | null;
  record_count?: number | null;
  is_active?: boolean;
  year?: number | null;
};

export type CountryDatasetResponse = {
  country_iso: string;
  total: number;
  datasets: DatasetInfo[];
};

/**
 * Fetch all datasets for a given country from the get-country-datasets Edge Function.
 * Returns a unified, normalized dataset array for use in wizards or SSC instances.
 */
export async function fetchCountryDatasets(countryIso: string): Promise<CountryDatasetResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = `${baseUrl}/functions/v1/get-country-datasets?iso=${countryIso}`;

  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const json = await res.json();

    // Basic sanity normalization
    const datasets: DatasetInfo[] = (json.datasets || []).map((d: any) => ({
      id: d.id,
      title: d.title ?? "Untitled Dataset",
      dataset_type: d.dataset_type ?? "other",
      join_field: d.join_field ?? "admin_pcode",
      source_table: d.source_table ?? "dataset_values",
      admin_level: d.admin_level ?? null,
      data_format: d.data_format ?? "numeric",
      record_count: d.record_count ?? null,
      is_active: d.is_active ?? true,
      year: d.year ?? null,
    }));

    return { country_iso: json.country_iso, total: datasets.length, datasets };
  } catch (err: any) {
    console.error("fetchCountryDatasets failed:", err.message);
    return { country_iso: countryIso, total: 0, datasets: [] };
  }
}
