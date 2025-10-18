"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import GenerateDerivedDatasetButton from "@/components/country/GenerateDerivedDatasetButton";

// 🔧 Temporary fallback until Supabase types are regenerated
type DatasetJoin = any;

export default function ManageJoinsCard({
  countryIso,
  joins = [],
}: {
  countryIso: string;
  joins: DatasetJoin[];
}) {
  const [openJoinId, setOpenJoinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const toggleJoin = (id: string) => {
    setOpenJoinId(openJoinId === id ? null : id);
  };

  const handleSetActive = async (id: string) => {
    setLoading(true);
    setStatus(null);

    // deactivate others, then activate selected
    const { error: deactivateError } = await supabase
      .from("dataset_joins")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    if (deactivateError) {
      console.error(deactivateError);
      setStatus("❌ Failed to update joins");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("dataset_joins")
      .update({ is_active: true })
      .eq("id", id);

    if (error) {
      console.error(error);
      setStatus("❌ Failed to activate join");
    } else {
      setStatus("✅ Active join updated");
    }
    setLoading(false);
  };

  return (
    <div className="border rounded-lg p-5 shadow-sm bg-white">
      <h2 className="text-lg font-semibold mb-3 text-[#123865] flex items-center gap-2">
        Manage Dataset Joins
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Each join combines Admin, Population, and GIS data to form an integrated
        analytical dataset. You can activate one join per country.
      </p>

      {/* Join list */}
      {joins.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {joins.map((join: any) => (
            <div key={join.id} className="py-2">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleJoin(join.id)}
              >
                <div className="flex items-center gap-2">
                  {openJoinId === join.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-800">
                    {join.notes || "Unnamed Join"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {join.is_active ? (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetActive(join.id);
                      }}
                      disabled={loading}
                      className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin inline-block" />
                      ) : (
                        "Set Active"
                      )}
                    </button>
                  )}
                </div>
              </div>

              {openJoinId === join.id && (
                <div className="mt-2 pl-6 text-sm text-gray-700">
                  {join.datasets ? (
                    <ul className="list-disc ml-4">
                      {Object.entries(join.datasets).map(([key, value]: any) => (
                        <li key={key}>
                          <span className="font-medium capitalize">{key}:</span>{" "}
                          {value?.title || value?.id || "—"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No dataset details found.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">
          No joins have been defined for this country yet.
        </p>
      )}

      {/* Status Message */}
      {status && (
        <p
          className={`mt-3 text-sm ${
            status.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {status}
        </p>
      )}

      {/* Derived Dataset Generation Section */}
      <div className="mt-6 border-t pt-5">
        <h3 className="text-md font-semibold mb-2 text-[#123865] flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" /> Derived Datasets
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Generate analytical datasets derived from existing Population and GIS
          data. This process computes new indicators such as Population Density.
        </p>

        <GenerateDerivedDatasetButton
          countryIso={countryIso}
          onComplete={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
