export interface CountryParams {
  id: string;
}

export interface Country {
  iso_code: string;
  name: string;
  adm0_label?: string | null;
  adm1_label?: string | null;
  adm2_label?: string | null;
  adm3_label?: string | null;
  adm4_label?: string | null;
  adm5_label?: string | null;
  dataset_sources?: Record<string, any>;
  extra_metadata?: Record<string, any>;
}
