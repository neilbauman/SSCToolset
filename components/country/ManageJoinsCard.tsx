"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button"; // ✅ Named export from your repo

type DatasetJoin = {
  id: string;
  country_iso: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  datasets: any;
};

export default function ManageJoinsCard({ countryIso }: { countryIso: string }) {
  const [joins, setJoins] = useState<DatasetJoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [expandedJoin, setExpandedJoin] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJoins = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dataset_joins")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching joins:", error);
      setJoins(data || []);
      setLoading(false);
    };
    fetchJoins();
  }, [countryIso]);

  const toggleExpand = (id: string) => {
    setExpandedJoin(expandedJoin === id ? null : id);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);

      const { data, error } = await supabase.rpc(
        "create_population_density_derived",
        { p_country_iso: countryIso }
      );

      if (error) throw error;
      alert(`Derived dataset created: ${data}`);
    } catch (err: any) {
      console.error("Error generating dataset:", err.message);
      setError("Error generating dataset");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border rounded-lg p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Manage Dataset Joins</h2>
        <Button
          onClick={() => setWizardOpen(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          + Create Derived Dataset
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading joins...
        </div>
      ) : joins.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No dataset joins defined yet for this country.
        </p>
      ) : (
        joins.map((join) => (
          <div
            key={join.id}
            className="border rounded-md mb-3 bg-gray-50 hover:bg-gray-100 transition"
          >
            <div
              className="flex justify-between items-center p-3 cursor-pointer"
              onClick={() => toggleExpand(join.id)}
            >
              <div className="flex items-center gap-2">
                {expandedJoin === join.id ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
                <span className="font-medium">
                  {join.notes || "Unnamed Join"}
                </span>
              </div>
              {join.is_active && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
            {expandedJoin === join.id && (
              <div className="p-4 border-t text-sm text-gray-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Admin:</strong>{" "}
                    {join.datasets?.admin_dataset_id || "Not linked"}
                  </li>
                  <li>
                    <strong>Population:</strong>{" "}
                    {join.datasets?.population_dataset_id || "Not linked"}
                  </li>
                  <li>
                    <strong>GIS:</strong>{" "}
                    {join.datasets?.gis_dataset_id || "Not linked"}
                  </li>
                  <li>
                    <strong>Other Datasets:</strong>{" "}
                    {join.datasets?.others?.length
                      ? join.datasets.others.join(", ")
                      : "None"}
                  </li>
                </ul>
              </div>
            )}
          </div>
        ))
      )}

      {/* Derived Datasets Section */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-blue-600" />
          Derived Datasets
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Generate analytical datasets derived from existing Population and GIS
          data.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            "Generate Population Density"
          )}
        </Button>
        {error && (
          <p className="text-red-600 text-sm mt-2">
            ❌ Error generating dataset
          </p>
        )}
      </div>

      {/* Wizard Modal */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Create Derived Dataset"
      >
        <div className="text-sm text-gray-700">
          <p className="mb-3">
            This is a placeholder for the Derived Dataset Wizard. It will let
            you select multiple datasets, preview overlaps, and define formulas.
          </p>
          <Button
            onClick={() => setWizardOpen(false)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
