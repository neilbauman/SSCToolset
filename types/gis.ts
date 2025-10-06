export interface GISDatasetVersion {
  id: string;
  country_iso: string;
  title: string;
  year?: number | null;
  dataset_date?: string | null;
  is_active: boolean;
  source_name?: string | null;
  source_url?: string | null;
  created_at?: string;
}

export interface GISLayer {
  id: string;
  layer_name: string;
  admin_level: string | null;
  admin_level_int: number | null;
  is_active: boolean;
  dataset_version?: string | null;
  version_active?: boolean;
  format?: string | null;
  crs?: string | null;
  feature_count?: number | null;
  source?: { path?: string; url?: string } | null;
  created_at?: string;
}
