export interface GISLayer {
  id: string;
  country_iso: string;
  layer_name: string;
  admin_level: string | null;
  admin_level_int: number | null;
  format: string;
  crs: string | null;
  feature_count?: number | null;
  is_active: boolean;
  source?: { path?: string; url?: string } | null;
  created_at?: string;
  dataset_version_id?: string | null;
}

export interface GISDatasetVersion {
  id: string;
  country_iso: string;
  title: string;
  source?: string | null;
  year?: number | null;
  dataset_date?: string | null;
  is_active?: boolean;
  created_at?: string;
  source_name?: string | null;
  source_url?: string | null;
}
