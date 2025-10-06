export interface PopulationDataset {
  id: string;
  country_iso: string;
  title?: string | null;
  year?: number | null;
  dataset_date?: string | null;  // ISO string
  source?: Record<string, any> | null;  // jsonb
  is_active: boolean;
  created_at?: string;
  lowest_level?: string | null;  // e.g., ADM2
  completeness?: number | null;  // numeric
}
