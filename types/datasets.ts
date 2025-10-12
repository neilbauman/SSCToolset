// /types/datasets.ts
export type DatasetMeta = {
  id: string;
  title: string;
  description: string | null;
  indicator_id?: string | null;
  type?: string | null;
  admin_level?: string | null;
  data_type?: string | null;
  source?: string | null;
  created_at: string;
  year?: number | null;
  unit?: string | null;
  theme?: string | null;
  upload_type?: string | null;
  country_iso?: string | null;
};
