"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DerivedDatasetTable from "./DerivedDatasetTable";
import CreateDerivedDatasetWizard_JoinAware from "./CreateDerivedDatasetWizard_JoinAware";

/**
 * DerivedDatasetsPanel
 * Displays current derived datasets and opens join-aware wizard.
 */
export default function DerivedDatasetsPanel({ countryIso }: { countryIso: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    const { data, error } = await supabase
      .from("view_derived_dataset_summary")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data);
  }

  useEffect(() => {
    load();
  }, [countryIso, refreshKey]);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Derived Datasets</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {rows.length === 0 && (
        <div className="text-gray-500 text-sm">No derived datasets yet.</div>
      )}

      {rows.map((r) => (
        <div
          key={r.derived_dataset_id}
          className="border-t py-2 text-sm flex justify-between"
        >
          <div>
            <div className="font-medium">{r.derived_title}</div>
            <div className="text-gray-500">
              ADM: {r.admin_level} | Records: {r.record_count ?? "?"}
            </div>
          </div>
          <div className="text-gray-500">{r.year}</div>
        </div>
      ))}

      <CreateDerivedDatasetWizard_JoinAware
        open={open}
        onClose={() => setOpen(false)}
        countryIso={countryIso}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
