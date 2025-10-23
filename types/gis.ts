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
    [key: string]: any;
  } | null;

  // Relations
  dataset_id?: string | null;
  dataset_version_id?: string | null;

  // Admin level flags
  admin_level?: string | null;      // e.g. "ADM0"..."ADM5"
  admin_level_int?: number | null;

  // ✅ Metrics and spatial summaries
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
