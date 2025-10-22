"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import CreateDerivedDatasetWizard_JoinAware from "./CreateDerivedDatasetWizard_JoinAware";

type DerivedDataset = {
  derived_dataset_id: string;
  derived_title: string;
  admin_level: string;
  year: number | null;
  method: string | null;
  record_count: number | null;
  created_at: string;
};

type Props = {
  countryIso: string;
};

export default function DerivedDatasetsPanel({ countryIso }: Props) {
  const sb = supabaseBrowser;
  const [derivedDatasets, setDerivedDatasets] = useState<DerivedDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ---------- Load derived datasets ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await sb
        .from("view_derived_dataset_summary")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (!error && data) setDerivedDatasets(data);
      setLoading(false);
    };
    load();
  }, [countryIso, refreshKey]);

  return (
    <div className="p-3 text-[13px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold">Derived Datasets</h2>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white text-xs px-3 py-1 rounded"
        >
          + Create Derived
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Loading derived datasets...</p>
      ) : derivedDatasets.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          No derived datasets found.
        </p>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Level</th>
                <th className="p-2 text-left">Year</th>
                <th className="p-2 text-left">Method</th>
                <th className="p-2 text-right">Records</th>
              </tr>
            </thead>
            <tbody>
              {derivedDatasets.map((d) => (
                <tr key={d.derived_dataset_id} className="border-t">
                  <td className="p-2">{d.derived_title}</td>
                  <td className="p-2">{d.admin_level}</td>
                  <td className="p-2">{d.year ?? "—"}</td>
                  <td className="p-2">{d.method ?? "—"}</td>
                  <td className="p-2 text-right">{d.record_count ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Wizard Modal ---------- */}
      {open && (
        <CreateDerivedDatasetWizard_JoinAware
          open={open}
          countryIso={countryIso}
          onClose={() => {
            setOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
