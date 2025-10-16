export type DatasetCategoryMap = {
  id: string;
  dataset_id: string;
  code: string;
  label: string;
  score: number | null;
  created_at: string;
};

export type DatasetValueCategorical = {
  id: string;
  dataset_id: string;
  admin_pcode: string;
  admin_level: string;
  time_value: string | null;
  category_code: string;
  category_label: string;
  category_score: number | null;
  created_at: string;
};

export type DatasetMetadata = {
  id: string;
  title: string;
  description?: string | null;
  country_iso?: string | null;
  indicator_id?: string | null;
  admin_level: string;
  data_type: "numeric" | "categorical";
  year?: number | null;
  created_at?: string;
};
