"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import WizardComputationPanel from "./WizardComputationPanel";
import WizardDerivedPanel from "./WizardDerivedPanel";

export default function WizardIndex({ countryIso }: { countryIso: string }) {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 🗂️ Load base datasets available for derivation
  useEffect(() => {
    const loadDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("view_country_datasets")
          .select("dataset_id, title, admin_level, data_health, record_count")
          .eq("country_iso", countryIso);

        if (error) throw error;
        setDatasets(data || []);
      } catch (err: any) {
        console.error("Failed to load datasets:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDatasets();
  }, [countryIso, supabase]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Derived Dataset Wizard
        </h1>
      </div>

      {/* Dataset summary */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading datasets...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">Error: {error}</p>
      ) : (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2 text-lg">Available Base Datasets</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left px-2 py-1">Title</th>
                  <th className="text-left px-2 py-1">Admin Level</th>
                  <th className="text-left px-2 py-1">Records</th>
                  <th className="text-left px-2 py-1">Health</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => (
                  <tr key={ds.dataset_id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1">{ds.title}</td>
                    <td className="px-2 py-1">{ds.admin_level}</td>
                    <td className="px-2 py-1">{ds.record_count}</td>
                    <td className="px-2 py-1">{ds.data_health || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Computation Controls */}
      <WizardComputationPanel
        countryIso={countryIso}
        onPreview={setPreviewData}
      />

      {/* Derived Dataset Preview & Save */}
      <WizardDerivedPanel
        countryIso={countryIso}
        previewData={previewData}
      />
    </div>
  );
}
