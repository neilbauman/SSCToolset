// types/gis.ts

export type GISFileFormat = 'geojson' | 'json' | 'shapefile' | 'gpkg' | string;

export interface GISLayer {
  id: string;
  country_iso: string;

  // Display / identity
  layer_name: string;

  // Storage
  storage_path?: string | null;

  // Format / metadata
  format?: GISFileFormat | null;
  feature_count?: number | null; // bigint -> number
  crs?: string | null;

  // JSONB source blob (canonical location for bucket/path)
  source?: {
    bucket?: string | null;
    path?: string | null;
    [key: string]: any;
  } | null;

  // Relations
  dataset_id?: string | null;
  dataset_version_id?: string | null;

  // Admin level flags
  admin_level?: string | null; // e.g. ADM0–ADM5
  admin_level_int?: number | null;

  // 🧮 Spatial metrics (new)
  avg_area_sqkm?: number | null;
  avg_perimeter_km?: number | null;
  centroid_lat?: number | null;
  centroid_lon?: number | null;
  bounding_box?: Record<string, any> | null;

  // Status + timestamps
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;

  // Runtime-only (not stored in DB)
  _publicUrl?: string | null;
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
