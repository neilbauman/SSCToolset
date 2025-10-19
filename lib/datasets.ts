// /lib/datasets.ts
// Unified front-end adapter for dataset and indicator discovery
// Used in Country Config, Derived Dataset Wizard, and SSC Instances

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
  // Optional indicator linkage
  indicator_id?: string | null;
  indicator_title?: string | null;
  theme?: string | null;
  subtheme?: string | null;
};

export type CountryDatasetResponse = {
  country_iso: string;
  total: number;
  datasets: DatasetInfo[];
};

/**
 * Fetch datasets (and optionally indicators) for a given country.
 * Calls the RLS-safe Edge Function `get-country-datasets`.
 * Returns a consistent, typed payload for both UI and analytical use.
 */
export async function fetchCountryDatasets(
  countryIso: string,
  includeIndicators = true
): Promise<CountryDatasetResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const edgeUrl = `${baseUrl}/functions/v1/get-country-datasets?iso=${countryIso}`;
  const viewUrl = `${baseUrl}/rest/v1/view_dataset_with_indicator?select=*`;

  try {
    // -----------------------------------------------------------------------
    // Primary unified dataset fetch
    const res = await fetch(edgeUrl, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.error("❌ Edge function error:", res.status, res.statusText);
      throw new Error(`Edge function failed (${res.status})`);
    }

    const json = await res.json();

    // Defensive handling: ensure proper structure
    const raw = json?.datasets ?? [];
    const datasets: DatasetInfo[] = raw.map((d: any) => ({
      id: d.id ?? crypto.randomUUID(),
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

    // -----------------------------------------------------------------------
    // Optional indicator enrichment (SSC linkage)
    if (includeIndicators) {
      try {
        const resp = await fetch(`${viewUrl}&country_iso=eq.${countryIso}`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
            "Content-Type": "application/json",
          },
        });

        if (resp.ok) {
          const indicators = await resp.json();
          const map = new Map<string, any>();
          for (const i of indicators) map.set(i.dataset_id, i);

          for (const d of datasets) {
            const link = map.get(d.id);
            if (link) {
              d.indicator_id = link.indicator_id;
              d.indicator_title = link.indicator_title ?? link.indicator_name ?? null;
              d.theme = link.theme ?? null;
              d.subtheme = link.subtheme ?? null;
            }
          }
        } else {
          console.warn(
            "⚠️ view_dataset_with_indicator fetch failed:",
            resp.status
          );
        }
      } catch (err: any) {
        console.warn("⚠️ Indicator enrichment skipped:", err.message);
      }
    }

    // -----------------------------------------------------------------------
    // Return standardized object
    return {
      country_iso: json.country_iso ?? countryIso,
      total: datasets.length,
      datasets,
    };
  } catch (err: any) {
    console.error("fetchCountryDatasets failed:", err.message);
    return { country_iso: countryIso, total: 0, datasets: [] };
  }
}
