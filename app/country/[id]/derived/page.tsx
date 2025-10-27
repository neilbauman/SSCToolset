"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PlusCircle, Eye, Trash2, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import DerivedDatasetWizard from "@/components/country/wizard";

export default function DerivedDatasetsPage() {
  const supabase = supabaseBrowser;
  const { id } = useParams();
  const countryIso = id as string;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWizard, setOpenWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load derived datasets
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

  // Delete dataset
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Derived Datasets
          </h1>
          <p className="text-sm text-gray-500">
            Configure and view derived datasets for {countryIso}
          </p>
        </div>

        <button
          onClick={() => setOpenWizard(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <PlusCircle size={18} />
          Add Derived Dataset
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href={`/country/${countryIso}`}>Country Overview</Link> /{" "}
        <span className="font-medium text-gray-700">Derived Datasets</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-gray-400" size={24} />
            <span className="ml-2 text-gray-500">Loading datasets...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600">Error: {error}</div>
        ) : datasets.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">
            No derived datasets yet. Click{" "}
            <span className="font-semibold text-blue-600">Add Derived Dataset</span> to create one.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Admin</th>
                <th className="px-3 py-2 text-left font-medium">Method</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
                <th className="px-3 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr
                  key={ds.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2">{ds.title}</td>
                  <td className="px-3 py-2">{ds.admin_level}</td>
                  <td className="px-3 py-2">{ds.method}</td>
                  <td className="px-3 py-2">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-center flex items-center justify-center gap-3">
                    <Link
                      href={`/country/${countryIso}/derived/${ds.id}`}
                      className="text-blue-600 hover:text-blue-800"
                      title="View"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => deleteDataset(ds.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Wizard */}
      {openWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full h-[90vh] overflow-y-auto relative">
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
