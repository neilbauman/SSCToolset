"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type DatasetOption = { id: string; title: string; source: Source; table: string };
type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: any | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(2.5);
  const [decimals, setDecimals] = useState(2);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [dynamic, setDynamic] = useState(true);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});

  // Load dataset options
  useEffect(() => {
    if (!open) return;
    const loadDatasets = async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Boundaries [core]", source: "core", table: "admin_units" },
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features" },
      ];
      const { data: others } = await supabase.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (others)
        others.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
        );
      const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (derived)
        derived.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );
      setDatasets(all);
    };
    loadDatasets();
  }, [open, countryIso]);

  // Load taxonomy
  useEffect(() => {
    if (!open) return;
    const loadTaxonomy = async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach((t) => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t.name);
      });
      setCategories(grouped);
    };
    loadTaxonomy();
  }, [open]);

  // Handle preview
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Please select Dataset A and either Dataset B or a scalar.");
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: datasetB?.table || null,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    setLoadingPreview(false);
    if (error) {
      alert("Preview error: " + error.message);
    } else {
      setPreview(data || []);
    }
  }

  // Handle save
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Please select Dataset A and either Dataset B or a scalar.");
      return;
    }
    const { error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA.table,
      p_table_b: datasetB?.table || null,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
      p_method: method,
      p_decimals: decimals,
      p_dynamic_resolution: dynamic,
      p_formula: `${colA} ${method} ${useScalarB ? scalarB : colB}`,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flat(),
    });
    if (error) {
      alert("Save failed: " + error.message);
    } else {
      alert("✅ Derived dataset saved successfully!");
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title + Description + Level */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <select
            className="border p-1 rounded"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* Dynamic toggle */}
        <label className="flex items-center gap-2 mb-3 text-xs">
          <input type="checkbox" checked={dynamic} disabled /> Dynamic (auto-refresh / parametric)
        </label>

        {/* Dataset pickers */}
        <div className="flex flex-wrap gap-3 mb-4">
          {([
  ["Dataset A", datasetA, setDatasetA],
  ["Dataset B", datasetB, setDatasetB],
] as [string, DatasetOption | null, React.Dispatch<React.SetStateAction<DatasetOption | null>>][]).map(
  ([label, ds, setDs], i) => (
    <div key={i} className="flex-1">
      <label className="font-medium text-xs">{label}</label>
              <select
                className="border p-1 rounded w-full disabled:bg-gray-100"
                value={(ds as DatasetOption | null)?.id || ""}
                onChange={(e) =>
                  setDs(datasets.find((x) => x.id === e.target.value) || null)
                }
                disabled={useScalarB && label === "Dataset B"}
              >
                <option value="">Select {label}</option>
                {["core", "other", "derived", "gis"].map((group) => (
                  <optgroup key={group} label={group.toUpperCase()}>
                    {datasets
                      .filter((d) => d.source === group)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Scalar toggle */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs">
            <input
              type="checkbox"
              checked={useScalarB}
              onChange={(e) => setUseScalarB(e.target.checked)}
            />{" "}
            Use scalar instead of Dataset B
          </label>
          {useScalarB && (
            <input
              type="number"
              step="any"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value))}
              className="border rounded w-24 text-right p-1"
            />
          )}
        </div>

        {/* Method buttons */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs">Method:</span>
          {["ratio", "multiply", "sum", "difference"].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m as any)}
              className={`px-2 py-1 border rounded ${
                method === m ? "bg-[#640811] text-white" : ""
              }`}
            >
              {m}
            </button>
          ))}
          <select
            className="ml-auto border rounded text-xs p-1"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
          >
            {[0, 1, 2, 3].map((d) => (
              <option key={d}>{d} dec</option>
            ))}
          </select>
          <button
            onClick={previewJoin}
            className="px-3 py-1 bg-[#640811] text-white rounded"
          >
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        {/* Formula hint */}
        <p className="text-xs italic mb-2">
          Derived = A.{colA}{" "}
          {method === "ratio"
            ? "÷"
            : method === "multiply"
            ? "×"
            : method === "sum"
            ? "+"
            : "-"}{" "}
          {useScalarB ? scalarB : `B.${colB}`}
        </p>

        {/* Preview table */}
        <div className="max-h-48 overflow-y-auto border rounded mb-4 text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A</th>
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.out_pcode}</td>
                  <td className="p-1">{r.place_name}</td>
                  <td className="p-1 text-right">{r.a}</td>
                  <td className="p-1 text-right">{r.b}</td>
                  <td className="p-1 text-right">{r.derived}</td>
                </tr>
              ))}
              {!preview.length && (
                <tr>
                  <td className="p-2 text-center text-gray-500" colSpan={5}>
                    No preview data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 bg-[#640811] text-white rounded"
          >
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
