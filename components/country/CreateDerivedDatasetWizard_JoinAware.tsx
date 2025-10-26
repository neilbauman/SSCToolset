"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type DatasetOption = { id: string; title: string; source: Source; table: string };
type Props = { open: boolean; onClose: () => void; countryIso: string };

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(2.5);
  const [decimals, setDecimals] = useState(3);
  const [preview, setPreview] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);

  // --- New categorical mode state ---
  const [mode, setMode] = useState<"quantitative" | "categorical">("quantitative");
  const [thresholds, setThresholds] = useState<
    { category_name: string; score_value: number; description?: string }[]
  >([]);

  // --- Load dataset options
  useEffect(() => {
    const loadDatasets = async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Boundaries [core]", source: "core", table: "admin_units" },
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features_normalized" },
      ];
      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (others) others.forEach((d: any) =>
        all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
      );
      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (derived)
        derived.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );
      setDatasets(all);
    };
    if (open) loadDatasets();
  }, [open, countryIso]);

  // --- Load taxonomy
  useEffect(() => {
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
    if (open) loadTaxonomy();
  }, [open]);

  // --- Load default thresholds for categorical mode
  useEffect(() => {
    const loadThresholds = async () => {
      if (mode !== "categorical") return;
      const { data, error } = await supabase
        .from("indicator_thresholds")
        .select("category_name, score_value, description")
        .eq("is_default", true);
      if (error) console.error("⚠️ Threshold fetch error:", error);
      else setThresholds(data || []);
    };
    loadThresholds();
  }, [mode]);

  // --- Preview join (quantitative)
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select datasets first");
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: datasetB?.table,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    setLoadingPreview(false);
    if (error) return alert("Preview error: " + error.message);
    setPreview(data || []);
  }

  // --- Save derived dataset
  async function saveDerived() {
    if (!datasetA) return alert("Select Dataset A first");

    // Construct transform function for categorical mapping
    const transform =
      mode === "categorical"
        ? {
            type: "categorical_mapping",
            mapping: thresholds.map((t) => ({
              category: t.category_name,
              score: t.score_value,
            })),
          }
        : null;

    const { error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA.table,
      p_table_b: mode === "quantitative" ? datasetB?.table || null : null,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flat(),
      p_formula: mode === "categorical" ? "categorical mapping" : `${colA} ${method} ${useScalarB ? scalarB : colB}`,
      p_transform_fn: transform ? JSON.stringify(transform) : null,
    });
    if (error) return alert("Save failed: " + error.message);
    alert("✅ Derived dataset created successfully.");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title, Description, Admin Level */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1","ADM2","ADM3","ADM4"].map((lvl) => <option key={lvl}>{lvl}</option>)}
          </select>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-4 mb-3">
          <label className="text-xs font-semibold">Dataset Type:</label>
          {["quantitative", "categorical"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              className={`px-3 py-1 border rounded text-xs ${
                mode === m ? "bg-[#640811] text-white" : ""
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Dataset Pickers (Quantitative Only) */}
        {mode === "quantitative" && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex-1">
              <label className="font-medium text-xs">Dataset A</label>
              <select className="border p-1 rounded w-full" value={datasetA?.id || ""} onChange={(e) => setDatasetA(datasets.find((x) => x.id === e.target.value) || null)}>
                <option value="">Select Dataset A</option>
                {["core","other","derived","gis"].map((group) => (
                  <optgroup key={group} label={group.toUpperCase()}>
                    {datasets.filter((d) => d.source === group).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {!useScalarB && (
              <div className="flex-1">
                <label className="font-medium text-xs">Dataset B</label>
                <select className="border p-1 rounded w-full" value={datasetB?.id || ""} onChange={(e) => setDatasetB(datasets.find((x) => x.id === e.target.value) || null)}>
                  <option value="">Select Dataset B</option>
                  {["core","other","derived","gis"].map((group) => (
                    <optgroup key={group} label={group.toUpperCase()}>
                      {datasets.filter((d) => d.source === group).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <label className="text-xs">
                <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} /> Use scalar
              </label>
              {useScalarB && (
                <input type="number" value={scalarB} onChange={(e) => setScalarB(parseFloat(e.target.value))} className="border rounded w-20 text-right p-1" />
              )}
              <select className="border rounded text-xs p-1" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))}>
                {[0,1,2,3].map((d) => <option key={d}>{d} dec</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Method + Preview (Quantitative Only) */}
        {mode === "quantitative" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">Method:</span>
              {["ratio","multiply","sum","difference"].map((m) => (
                <button key={m} onClick={() => setMethod(m as any)} className={`px-2 py-1 border rounded ${method===m ? "bg-[#640811] text-white" : ""}`}>{m}</button>
              ))}
              <button onClick={previewJoin} className="ml-auto px-3 py-1 bg-[#640811] text-white rounded">
                {loadingPreview ? "Loading..." : "Preview"}
              </button>
            </div>

            <p className="text-xs italic mb-2">
              Derived = A.{colA} {method==="ratio"?"÷":method==="multiply"?"×":method==="sum"?"+":"-"} {useScalarB?scalarB:`B.${colB}`}
            </p>

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
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Categorical Thresholds Editor */}
        {mode === "categorical" && (
          <div className="border rounded p-3 mb-4">
            <h3 className="text-sm font-semibold mb-2">Category-to-Score Mapping</h3>
            <table className="w-full text-xs border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 text-left">Category</th>
                  <th className="p-1 text-center">Score (1–5)</th>
                  <th className="p-1 text-left">Description</th>
                  <th className="p-1 text-center">✏️</th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map((t, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">
                      <input
                        className="border rounded px-1 w-full"
                        value={t.category_name}
                        onChange={(e) => {
                          const copy = [...thresholds];
                          copy[i].category_name = e.target.value;
                          setThresholds(copy);
                        }}
                      />
                    </td>
                    <td className="p-1 text-center">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="border rounded w-14 text-center"
                        value={t.score_value}
                        onChange={(e) => {
                          const copy = [...thresholds];
                          copy[i].score_value = Number(e.target.value);
                          setThresholds(copy);
                        }}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        className="border rounded px-1 w-full"
                        value={t.description || ""}
                        onChange={(e) => {
                          const copy = [...thresholds];
                          copy[i].description = e.target.value;
                          setThresholds(copy);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => setThresholds(thresholds.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✖
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setThresholds([...thresholds, { category_name: "", score_value: 1 }])}
              className="mt-2 px-3 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100"
            >
              + Add Category
            </button>
          </div>
        )}

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input type="checkbox" checked={!!taxonomy[cat]} onChange={(e) => {
                  const t={...taxonomy}; if(e.target.checked)t[cat]=[]; else delete t[cat]; setTaxonomy(t);
                }}/> {cat}
              </label>
              {taxonomy[cat] && (
                <div className="ml-3 mt-1 grid grid-cols-1">
                  {categories[cat].map((term) => (
                    <label key={term} className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={taxonomy[cat]?.includes(term)} onChange={(e)=>{
                        const t={...taxonomy};
                        if(e.target.checked)t[cat]=[...(t[cat]||[]),term];
                        else t[cat]=t[cat].filter(x=>x!==term);
                        setTaxonomy(t);
                      }}/> {term}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 bg-[#640811] text-white rounded">Save Derived</button>
        </div>
      </div>
    </div>
  );
}
