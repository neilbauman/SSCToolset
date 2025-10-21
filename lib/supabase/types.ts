export type Method = 'ratio' | 'multiply' | 'sum' | 'difference';

export type PreviewRow = {
  out_pcode: string;
  place_name: string | null;
  parent_pcode: string | null;
  parent_name: string | null;
  a: number | null;
  b: number | null;
  derived: number | null;
  col_a_used: string | null;
  col_b_used: string | null;
};

export type DatasetOption = {
  id?: string;
  table: string;
  label: string;
  type: 'Core' | 'Other' | 'Derived';
  admin_level?: string | null;
  year?: number | null;
};

export type TaxonomyTerm = {
  id: string;
  name: string;
  category: string | null;
  parent_id: string | null;
};

export type CreateDerivedPayload = {
  p_country: string;
  p_title: string;
  p_admin_level: string;
  p_year: number;
  p_method: Method;
  p_sources: string;
  p_scalar_b: number | null;
  p_rows: string;
};
