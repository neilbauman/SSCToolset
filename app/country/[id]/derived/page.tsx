"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import DerivedDatasetWizard from "@/components/country/wizard";

export default function DerivedDatasetsPage() {
  const supabase = supabaseBrowser;
  const { id } = useParams();
  const countryIso = id as string;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openWizard, setOpenWizard] = useState(false);

  const loadDerivedDatasets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("derived_dataset_metadata")
        .select("id, title, admin_level, created_at, method")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDataset = async (id: string) => {
    if (!confirm("Delete this derived dataset?")) return;
    try {
      await supabase.from("derived_dataset_metadata").delete().eq("id", id);
      await supabase.from("derived_dataset_records").delete().eq("derived_dataset_id", id);
      loadDerivedDatasets();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  useEffect(() => {
    loadDerivedDatasets();
  }, [countryIso]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Derived Datasets
        </h1>
        <button
          onClick={() => setOpenWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Derived Dataset
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading datasets...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : datasets.length === 0 ? (
        <p className="text-sm text-gray-500">No derived datasets yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b text-gray-700">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Admin</th>
                <th className="px-2 py-1 text-left">Method</th>
                <th className="px-2 py-1 text-left">Created</th>
                <th className="px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr key={ds.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1">{ds.title}</td>
                  <td className="px-2 py-1">{ds.admin_level}</td>
                  <td className="px-2 py-1">{ds.method}</td>
                  <td className="px-2 py-1">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => deleteDataset(ds.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setOpenWizard(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <DerivedDatasetWizard countryIso={countryIso} />
          </div>
        </div>
      )}
    </div>
  );
}
