// app/country/types.ts
// Shared types for all Country-level modules (GIS, Population, Admin Units, etc.)

/**
 * Route parameters for dynamic country pages.
 * e.g. /country/[id]
 */
export interface CountryParams {
  /** The ISO-3 code for the country (e.g. "PHL") */
  id: string;
}

/**
 * Core database record for a country (public.countries)
 * Mirrors Supabase schema for type safety.
 */
export interface CountryRecord {
  iso_code: string;
  name: string;
  adm0_label?: string | null;
  adm1_label?: string | null;
  adm2_label?: string | null;
  adm3_label?: string | null;
  adm4_label?: string | null;
  adm5_label?: string | null;
  dataset_sources?: any[] | null;
  extra_metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Lightweight structure for dataset joins within a country.
 */
export interface DatasetJoin {
  id: string;
  country_iso: string;
  is_active: boolean;
  created_at?: string;
  datasets?: {
    type: string;
    title?: string;
    year?: number;
  }[];
}

/**
 * Shared shape for GIS layer entries in public.gis_layers.
 */
export interface GISLayer {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  admin_level?: string | null;
  admin_level_int?: number | null;
  crs?: string | null;
  feature_count?: number | null;
  is_active: boolean;
  source?: {
    path?: string;
    url?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * GIS Dataset Version metadata.
 */
export interface GISDatasetVersion {
  id: string;
  country_iso: string;
  title: string;
  year?: number | null;
  dataset_date?: string | null;
  is_active?: boolean;
  source_name?: string | null;
  source_url?: string | null;
  created_at?: string;
}
