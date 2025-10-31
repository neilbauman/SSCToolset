"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type AdminLevel = "ADM1" | "ADM2" | "ADM3" | "ADM4";
type Method = "ratio" | "multiply" | "sum" | "difference";

export default function DerivedDatasetWizard({
  countryIso,
  onClose,
  editData,
}: {
  countryIso: string;
  onClose: () => void;
  editData?: any;
}) {
  const [title, setTitle] = useState(editData?.title || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [targetLevel, setTargetLevel] = useState<AdminLevel>(
    editData?.admin_level || "ADM3"
  );
  const [method, setMethod] = useState<Method>(editData?.method || "ratio");
  const [normalize, setNormalize] = useState(editData?.normalize_percent || false);
  const [isParametric, setIsParametric] = useState(editData?.is_parametric || false);
  const [useScalarB, setUseScalarB] = useState(editData?.use_scalar_b || false);
  const [scalarBVal, setScalarBVal] = useState(editData?.scalar_b_val || 0);
  const [decimals, setDecimals] = useState(editData?.decimals || 0);

  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetA, setDatasetA] = useState<any>(null);
  const [datasetB, setDatasetB] = useState<any>(null);
  const [colA, setColA] = useState(editData?.col_a || "");
  const [colB, setColB] = useState(editData?.col_b || "");
  const [joinA, setJoinA] = useState("pcode");
  const [joinB, setJoinB] = useState("pcode");

  const [taxonomy, setTaxonomy] = useState<string[]>(
    editData?.taxonomy_terms || []
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load datasets
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,join_field,default_join_field,country_iso")
        .eq("country_iso", countryIso)
        .order("title");

      if (!error && data) {
        const all = [
          { id: "population_data", title: "Population [core]", join_field: "pcode" },
          ...data,
        ];
        setDatasets(all);

        // Auto-select A/B on create or edit
        if (!editData) {
          setDatasetA(all.find((d) => d.id === "population_data"));
          setColA("population");
          setJoinA("pcode");
          setDatasetB(all[1]);
          setColB("value");
          setJoinB(all[1]?.join_field || all[1]?.default_join_field || "pcode");
        } else {
          const a = all.find(
            (d) => d.id === editData.dataset_a || d.title === editData.dataset_a
          );
          const b = all.find(
            (d) => d.id === editData.dataset_b || d.title === editData.dataset_b
          );
          setDatasetA(a || all[0]);
          setDatasetB(b || all[1]);
          setColA(editData.col_a || "population");
          setColB(editData.col_b || "value");
          setJoinA(a?.join_field || a?.default_join_field || "pcode");
          setJoinB(b?.join_field || b?.default_join_field || "pcode");
        }
      }
    })();
  }, [countryIso, editData]);

  // Adjust join fields when dataset changes
  useEffect(() => {
    if (datasetA)
      setJoinA(datasetA.join_field || datasetA.default_join_field || "pcode");
  }, [datasetA]);

  useEffect(() => {
    if (datasetB)
      setJoinB(datasetB.join_field || datasetB.default_join_field || "pcode");
  }, [datasetB]);

  const preview = async () => {
    if (!datasetA || !datasetB) return;
    setLoading(true);
    setError(null);
    setRows([]);

    const { data, error } = await supabase.rpc(
      "simulate_join_preview_autoaggregate_simple",
      {
        p_dataset_a: datasetA.id || datasetA.title,
        p_dataset_b: datasetB.id || datasetB.title,
        p_col_a: colA,
        p_col_b: colB,
        p_country_iso: countryIso,
        p_method: method,
        p_target_level: targetLevel,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarBVal : null,
      }
    );

    if (error) {
      setError(error.message);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  const save = async () => {
    const { error } = await supabase.rpc("create_derived_dataset_v2", {
      p_country: countryIso,
      p_title: title,
      p_description: description,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarBVal : null,
      p_dataset_a: datasetA?.id || datasetA?.title,
      p_dataset_b: datasetB?.id || datasetB?.title,
      p_col_a: colA,
      p_col_b: colB,
      p_formula: null,
      p_target_level: targetLevel,
      p_taxonomy_categories: [],
      p_taxonomy_terms: taxonomy,
      p_decimals: decimals,
      p_normalize_percent: normalize,
      p_is_parametric: isParametric,
    });
    if (error) setError(error.message);
    else onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-[1100px] max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* title + desc */}
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="flex-1 border rounded px-3 py-2"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="flex-1 border rounded px-3 py-2"
            />
          </div>

          {/* selector row */}
          <div className="flex gap-2 items-center">
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as AdminLevel)}
              className="border rounded px-2 py-1"
            >
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
            </select>

            <select
              value={datasetA?.id || ""}
              onChange={(e) =>
                setDatasetA(datasets.find((d) => d.id === e.target.value))
              }
              className="flex-1 border rounded px-2 py-1"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            <select
              value={datasetB?.id || ""}
              onChange={(e) =>
                setDatasetB(datasets.find((d) => d.id === e.target.value))
              }
              className="flex-1 border rounded px-2 py-1"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          {/* column names */}
          <div className="flex gap-2 items-center">
            <input
              value={colA}
              onChange={(e) => setColA(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
              placeholder="Column A"
            />
            <input
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
              placeholder="Column B"
            />
          </div>

          {/* join fields */}
          <div className="flex gap-2 items-center">
            <input
              value={joinA}
              readOnly
              className="border rounded px-2 py-1 flex-1 bg-gray-50"
            />
            <input
              value={joinB}
              readOnly
              className="border rounded px-2 py-1 flex-1 bg-gray-50"
            />
          </div>

          {/* method + toggles */}
          <div className="flex gap-2 items-center">
            {(["ratio", "multiply", "sum", "difference"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1 rounded border ${
                  method === m ? "bg-black text-white" : ""
                }`}
              >
                {m}
              </button>
            ))}
            <label className="ml-4 flex items-center gap-1">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
              />
              Normalize %
            </label>
            <label className="ml-4 flex items-center gap-1">
              <input
                type="checkbox"
                checked={isParametric}
                onChange={(e) => setIsParametric(e.target.checked)}
              />
              Parametric
            </label>
            <label className="ml-4 flex items-center gap-1">
              <input
                type="checkbox"
                checked={useScalarB}
                onChange={(e) => setUseScalarB(e.target.checked)}
              />
              Scalar B
            </label>
            <input
              type="number"
              disabled={!useScalarB}
              value={scalarBVal}
              onChange={(e) => setScalarBVal(parseFloat(e.target.value))}
              className="border rounded w-20 px-2 py-1"
            />
            <button
              onClick={preview}
              disabled={loading}
              className="ml-auto px-3 py-1 rounded border bg-gray-900 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* results */}
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "out_join_key",
                    "out_place_name",
                    "out_a",
                    "out_b",
                    "out_derived",
                    "out_col_a_used",
                    "out_col_b_used",
                    "out_join_status",
                    "out_source_level_a",
                    "out_source_level_b",
                    "out_target_level",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={r.out_join_key} className="odd:bg-white even:bg-gray-50">
                      {Object.values(r).map((v, i) => (
                        <td key={i} className="px-3 py-1 border-b">
                          {v ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-gray-500">
                      No preview yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* taxonomy */}
          <div>
            <h3 className="font-semibold mb-2">Assign Taxonomy</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                "Underlying Vulnerabilities",
                "Cross-cutting",
                "Hazard & Impact Data",
                "P1 - The Shelter",
                "P2 - The Living Conditions",
                "P3 - The Settlement",
                "Access to Services",
                "Presence of Hazards",
                "Communal Infrastructure",
              ].map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={taxonomy.includes(t)}
                    onChange={(e) =>
                      setTaxonomy((s) =>
                        e.target.checked
                          ? [...s, t]
                          : s.filter((x) => x !== t)
                      )
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t p-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border rounded px-3 py-1 bg-white"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="border rounded px-3 py-1 bg-gray-900 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
