'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateDerivedDatasetWizard_JoinAware from './CreateDerivedDatasetWizard_JoinAware';

export default function DerivedDatasetsPanel({
  countryIso,
  loading,
  datasets,
  onRefresh,
}: {
  countryIso: string;
  loading: boolean;
  datasets: any[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Derived Datasets</h1>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Create Derived Dataset
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow p-6">
            <CreateDerivedDatasetWizard_JoinAware
              countryIso={countryIso}
              onClose={() => {
                setOpen(false);
                onRefresh();
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : datasets.length === 0 ? (
        <p className="text-gray-500 text-sm">No derived datasets found.</p>
      ) : (
        <div className="overflow-x-auto border rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr><Th>Title</Th><Th>Year</Th><Th>Admin</Th><Th>Records</Th><Th>Health</Th><Th>Created</Th></tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
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
    </div>
  );
}

function Th({ children }: { children: any }) {
  return <th className="px-3 py-2 text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children }: { children: any }) {
  return <td className="px-3 py-2">{children}</td>;
}
