"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateDerivedDatasetWizard from "./CreateDerivedDatasetWizard";
import DerivedDatasetTable from "./DerivedDatasetTable";

export default function DerivedDatasetsPanel({ countryIso }: { countryIso: string }) {
  const [open, setOpen] = useState(false);
  // simple remount trick to refresh the table after creation
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Derived Datasets</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {/* table reads from view_derived_dataset_summary */}
      <div className="mt-1">
        <DerivedDatasetTable key={refreshKey} countryIso={countryIso} />
      </div>

      <CreateDerivedDatasetWizard
        open={open}
        onClose={() => setOpen(false)}
        countryIso={countryIso}
        onCreated={() => {
          setOpen(false);
          setRefreshKey((k) => k + 1); // refresh table
        }}
      />
    </div>
  );
}
