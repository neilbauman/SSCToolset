// types/gis.ts

export type GISFileFormat = "geojson" | "json" | "shapefile" | "gpkg" | string;

export interface GISLayer {
  id: string;
  country_iso: string;

  // Display / identity
  layer_name: string;

  // Storage
  storage_path?: string | null;

  // Format / metadata
  format?: GISFileFormat | null;
  feature_count?: number | null;
  crs?: string | null;

  // Canonical source JSONB (preferred)
  source?: {
    bucket?: string | null;
    path?: string | null;
    [key: string]: any;
  } | null;

  // Relations
  dataset_id?: string | null;
  dataset_version_id?: string | null;

  // Admin level
  admin_level?: string | null;
  admin_level_int?: number | null;

  // Spatial metrics
  avg_area_sqkm?: number | null;
  centroid_lat?: number | null;
  centroid_lon?: number | null;

  // Integrity metrics
  unique_pcodes?: number | null;
  missing_names?: number | null;

  // Status + timestamps
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}
