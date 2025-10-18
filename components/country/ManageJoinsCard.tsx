"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";
import CreateDerivedDatasetWizard from "@/components/country/CreateDerivedDatasetWizard";

type DatasetJoin = {
  id: string;
  title?: string;
  country_iso: string;
  is_active: boolean;
  notes?: string;
  datasets: any;
  created_at: string;
};

interface ManageJoinsCardProps {
  countryIso: string;
  joins: DatasetJoin[];
}

export default function ManageJoinsCard({ countryIso, joins }: ManageJoinsCardProps) {
  const [openJoin, setOpenJoin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeJoin, setActiveJoin] = useState<DatasetJoin | null>(null);

  useEffect(() => {
    const active = joins.find((j) => j.is_active);
    if (active) setActiveJoin(active);
  }, [joins]);

  const handleSetActive = async (joinId: string) => {
    setLoading(true);
    await supabase.from("dataset_joins").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("dataset_joins").update({ is_active: true }).eq("id", joinId);
    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="border rounded-lg shadow-sm p-6 bg-white">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Manage Dataset Joins</h2>
      <p className="text-sm text-gray-600 mb-4">
        Each join combines Admin, Population, and GIS data to form an integrated analytical dataset. 
        You can activate one join per country.
      </p>

      {/* Join List */}
      <div className="divide-y border rounded">
        {joins.length === 0 && (
          <div className="p-4 text-gray-500 text-sm">No joins configured for this country yet.</div>
        )}
        {joins.map((j) => (
          <div key={j.id} className="p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setOpenJoin(openJoin === j.id ? null : j.id)}
            >
              <div className="flex items-center gap-2">
                {openJoin === j.id ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <h3 className="font-medium text-gray-800">
                  {j.title || "Unnamed Join"}{" "}
                  {!j.is_active && (
                    <span className="text-xs text-gray-400">(inactive)</span>
                  )}
                </h3>
              </div>
              <Button
                size="sm"
                disabled={loading || j.is_active}
                onClick={() => handleSetActive(j.id)}
              >
                {loading && j.is_active ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-1" />
                ) : (
                  "Set Active"
                )}
              </Button>
            </div>

            {openJoin === j.id && (
              <div className="mt-2 ml-6 text-sm text-gray-700 space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>GIS:</strong>{" "}
                    {j.datasets?.gis_dataset_id
                      ? "Active GIS Layers"
                      : "—"}
                  </li>
                  <li>
                    <strong>Admin:</strong>{" "}
                    {j.datasets?.admin_dataset_id
                      ? "Active Admin Boundaries"
                      : "—"}
                  </li>
                  <li>
                    <strong>Population:</strong>{" "}
                    {j.datasets?.population_dataset_id
                      ? "Active Population Dataset"
                      : "—"}
                  </li>
                  <li>
                    <strong>Other:</strong>{" "}
                    {j.datasets?.other_datasets?.length
                      ? j.datasets.other_datasets.length + " linked"
                      : "—"}
                  </li>
                </ul>
                {j.notes && <p className="text-xs text-gray-500 mt-2">{j.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Derived Datasets Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-blue-600" /> Derived Datasets
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate analytical datasets derived from existing Population and GIS data.
          This process computes new indicators such as Population Density.
        </p>

        <Button
          onClick={() => setWizardOpen(true)}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Brain className="w-4 h-4 mr-2" />
          Construct New Dataset
        </Button>

        <CreateDerivedDatasetWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          countryIso={countryIso}
          onComplete={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
