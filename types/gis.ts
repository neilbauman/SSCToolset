export type GISFileFormat = 'geojson' | 'shapefile' | 'gpkg' | string;

export interface GISLayer {
  id: string;
  country_iso: string;
  layer_name: string;
  format: GISFileFormat;
  feature_count?: number | null;  // bigint -> number
  crs?: string | null;
  source?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
  dataset_id?: string | null;
  dataset_version_id?: string | null;
  admin_level?: string | null;
  admin_level_int?: number | null;
  is_active: boolean;
}

export interface GISDatasetVersion {
  id: string;
  country_iso: string;
  title: string;
  source?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  year?: number | null;
  dataset_date?: string | null; // ISO string
  is_active: boolean;
  created_at?: string;
}
