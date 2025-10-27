"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export default function WizardDerivedPanel({
  countryIso,
  previewData = [],
}: {
  countryIso: string;
  previewData: any[];
}) {
  const supabase = supabaseBrowser;
  const [saving, setSaving] = useState(false);

  const saveDerivedDataset = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create_derived_dataset_v2", {
        body: {
          p_table_a: "population_data",
          p_table_b: "poverty_rate",
          p_col_a: "population",
          p_col_b: "poverty_rate",
          p_country_iso: countryIso,
          p_method: "multiply",
          p_target_level: "ADM3",
          p_use_scalar_b: false,
          p_scalar_b_val: 1,
          p_normalize_percent: true,
          p_is_parametric: true,
        },
      });

      if (error) throw error;
      alert("Derived dataset created successfully!");
    } catch (err: any) {
      alert("Failed to save derived dataset: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm mt-4">
      <h2 className="text-lg font-semibold mb-3">Preview Results</h2>

      {previewData.length === 0 ? (
        <p className="text-sm text-gray-500">Run a preview first.</p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 border-b">
              <tr>
                <th className="px-2 py-1 text-left">Pcode</th>
                <th className="px-2 py-1 text-left">Name</th>
                <th className="px-2 py-1 text-right">A</th>
                <th className="px-2 py-1 text-right">B</th>
                <th className="px-2 py-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1">{row.pcode}</td>
                  <td className="px-2 py-1">{row.name}</td>
                  <td className="px-2 py-1 text-right">{row.a ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{row.b ?? "-"}</td>
                  <td className="px-2 py-1 text-right font-semibold">
                    {row.derived ? Number(row.derived).toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={saveDerivedDataset}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {saving ? "Saving..." : "Save Derived Dataset"}
        </button>
      </div>
    </div>
  );
}
