import { SupabaseClient } from '@supabase/supabase-js';
import type { Method, PreviewRow, CreateDerivedPayload, DatasetOption, TaxonomyTerm } from './types';

export async function simulateJoinPreview(
  supabase: SupabaseClient,
  args: {
    p_table_a: string;
    p_table_b: string | null;
    p_country: string;
    p_target_level: string;
    p_method: Method;
    p_col_a: string;
    p_col_b: string | null;
    p_use_scalar_b: boolean;
    p_scalar_b_val: number | null;
  }
) {
  const { data, error } = await supabase.rpc('simulate_join_preview_autoaggregate', {
    p_table_a: args.p_table_a,
    p_table_b: args.p_table_b,
    p_country: args.p_country,
    p_target_level: args.p_target_level,
    p_method: args.p_method,
    p_col_a: args.p_col_a,
    p_col_b: args.p_col_b,
    p_use_scalar_b: args.p_use_scalar_b,
    p_scalar_b_val: args.p_scalar_b_val ?? 0
  });
  if (error) throw error;
  return (data ?? []) as PreviewRow[];
}

export async function createDerivedDataset(
  supabase: SupabaseClient,
  payload: CreateDerivedPayload
) {
  const { data, error } = await supabase.rpc('create_derived_dataset', payload);
  if (error) throw error;
  return data as string;
}

export async function loadDatasetOptions(supabase: SupabaseClient, countryIso: string): Promise<DatasetOption[]> {
  const { data, error } = await supabase
    .from('view_country_datasets')
    .select('*')
    .eq('country_iso', countryIso)
    .order('admin_level', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    table: row.table_name ?? row.view_name ?? row.source_table ?? row.id,
    label: row.title ?? row.name ?? row.id,
    type: row.type ?? 'Other',
    admin_level: row.admin_level,
    year: row.year
  }));
}

export async function loadTaxonomyTerms(supabase: SupabaseClient): Promise<TaxonomyTerm[]> {
  const { data, error } = await supabase
    .from('taxonomy_terms')
    .select('id, name, category, parent_id')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaxonomyTerm[];
}
