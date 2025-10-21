'use client';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';
import DerivedDatasetsPanel from '@/components/country/DerivedDatasetsPanel';
import { useParams } from 'next/navigation';

export default function DerivedPage() {
  const { id } = useParams();
  const iso = id as string;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const sb = supabaseBrowser;
    const { data, error } = await sb
      .from('view_derived_dataset_summary')
      .select('*')
      .eq('country_iso', iso)
      .order('created_at', { ascending: false });
    if (!error) setDatasets(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (iso) loadData(); }, [iso]);

  return (
    <SidebarLayout
      headerProps={{
        title: 'Derived Datasets',
        group: 'country-config',
        description: 'Manage datasets derived from existing country-level data sources.',
      }}
    >
      <DerivedDatasetsPanel
        countryIso={iso}
        loading={loading}
        datasets={datasets}
        onRefresh={loadData}
      />
    </SidebarLayout>
  );
}
