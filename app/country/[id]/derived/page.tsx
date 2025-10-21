'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';
import CreateDerivedDatasetWizard_JoinAware from '@/components/country/CreateDerivedDatasetWizard_JoinAware';
import { Plus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

type DerivedSummary = {
  derived_dataset_id: string;
  derived_title: string;
  country_iso: string;
  year: number | null;
  admin_level: string | null;
  record_count: number | null;
  data_health: string | null;
  created_at: string | null;
};

export default function DerivedDatasetsPage() {
  const router = useRouter();
  const params = useParams();
  const iso = params?.id as string;

  const [derived, setDerived] = useState<DerivedSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadDerived() {
    setLoading(true);
    try {
      const sb = supabaseBrowser;
      const { data, error } = await sb
        .from('view_derived_dataset_summary')
        .select('*')
        .eq('country_iso', iso)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDerived(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (iso) loadDerived();
  }, [iso]);

  return (
    <SidebarLayout
      headerProps={{
        title: 'Derived Datasets',
        group: 'country-config',
        description:
          'View and manage datasets derived from existing country-level data sources.',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Derived Datasets</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          <Plus size={16} /> Create Derived Dataset
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <CreateDerivedDatasetWizard_JoinAware
              countryIso={iso}
              onClose={() => {
                setCreating(false);
                router.refresh(); // ✅ Refresh the list after modal closes
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading derived datasets…</p>
      ) : derived.length === 0 ? (
        <p className="text-gray-500 text-sm">No derived datasets found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <Th>Title</Th>
                <Th>Year</Th>
                <Th>Admin Level</Th>
                <Th>Records</Th>
                <Th>Health</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {derived.map((d) => (
                <tr key={d.derived_dataset_id} className="border-b hover:bg-gray-50">
                  <Td>{d.derived_title}</Td>
                  <Td>{d.year ?? ''}</Td>
                  <Td>{d.admin_level ?? ''}</Td>
                  <Td>{d.record_count ?? 0}</Td>
                  <Td>{d.data_health ?? ''}</Td>
                  <Td>{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SidebarLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-sm">{children}</td>;
}
