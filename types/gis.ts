// types/gis.ts

export type GISFileFormat = 'geojson' | 'json' | 'shapefile' | 'gpkg' | string;

export interface GISLayer {
  id: string;
  country_iso: string;

  // Display / identity
  layer_name: string;

  // Storage (some rows may have this null and instead use source.bucket/source.path)
  storage_path?: string | null;

  // Format / metadata
  format?: GISFileFormat | null;
  feature_count?: number | null;   // bigint -> number
  crs?: string | null;

  // JSONB source blob (preferred canonical location for bucket/path going forward)
  source?: {
    bucket?: string | null;
    path?: string | null;
    // allow any extra provider-specific fields without type errors
    [key: string]: any;
  } | null;

  // Relations
  dataset_id?: string | null;
  dataset_version_id?: string | null;

  // Admin level flags
  admin_level?: string | null;      // e.g. "ADM0"..."ADM5"
  admin_level_int?: number | null;

  // Status + timestamps
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
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
