"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Option = { id: string; title: string; source: "core" | "other" | "derived"; table: string };
type Props = { open: boolean; onClose: () => void; countryIso: string };

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(false);
  const [datasets, setDatasets] = useState<Option[]>([]);
  const [datasetA, setDatasetA] = useState<Option | null>(null);
  const [datasetB, setDatasetB] = useState<Option | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [scalarB, setScalarB] = useState<number>(5.1);
  const [useScalarB, setUseScalarB] = useState(true);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [targetLevel, setTargetLevel] = useState("ADM4");

  // Load datasets based on toggles
  useEffect(() => {
    const load = async () => {
      const all: Option[] = [];
      if (includeCore) {
        all.push({ id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" });
        if (includeGIS) all.push({ id: "core-gis", title: "GIS Features [core]", source: "core", table: "gis_features" });
      }
      if (includeOther) {
        const { data } = await supabase.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
        if (data) data.forEach((d) => all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` }));
      }
      if (includeDerived) {
        const { data } = await supabase.from("derived_dataset_metadata").select("id,title").eq("country_iso", countryIso);
        if (data) data.forEach((d) => all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` }));
      }
      setDatasets(all);
    };
    if (open) load();
  }, [includeCore, includeOther, includeDerived, includeGIS, open, countryIso]);

  // Load taxonomy categories and terms
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

  // Peek dataset
  const peekDataset = async (table: string, side: "A" | "B") => {
    const { data } = await supabase.from(table).select("*").limit(5);
    if (data) side === "A" ? setPreviewA(data) : setPreviewB(data);
  };

  // Preview join
  const previewJoin = async () => {
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table || "",
      p_table_b: datasetB?.table || "",
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    if (!error && data) setPreview(data);
  };

  // Save derived dataset
  const saveDerived = async () => {
    const { error } = await supabase.from("derived_dataset_metadata").insert({
      country_iso: countryIso,
      title,
      description: desc,
      admin_level: targetLevel,
      taxonomy_categories: Object.keys(taxonomy).join(","),
      taxonomy_terms: Object.values(taxonomy).flat().join(","),
      formula: `${colA} ${method} ${useScalarB ? scalarB : colB}`,
    });
    if (!error) onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-5xl rounded-lg p-5 shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold mb-2">Create Derived Dataset</h2>

        {/* Dataset Source Toggles */}
        <div className="flex flex-wrap gap-4 text-sm mb-3">
          {(
  [
    { label: "Include Core", value: includeCore, set: setIncludeCore },
    { label: "Include Other", value: includeOther, set: setIncludeOther },
    { label: "Include Derived", value: includeDerived, set: setIncludeDerived },
    { label: "Include GIS", value: includeGIS, set: setIncludeGIS },
  ] as const
).map(({ label, value, set }) => (
  <label key={label} className="flex items-center gap-1">
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => set(e.target.checked)}
    />
    {label}
  </label>
))}
        </div>

        {/* Header */}
        <div className="flex gap-2 mb-3 text-sm">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="border p-1 rounded" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Dataset Pickers */}
        <div className="flex gap-2 items-center mb-3">
          <select className="border p-1 rounded flex-1 text-sm" value={datasetA?.id || ""} onChange={(e) => {
            const d = datasets.find(x => x.id === e.target.value); setDatasetA(d || null);
          }}>
            <option value="">Select Dataset A</option>
            {datasets.map((d) => (
              <option key={d.id}>{d.title}</option>
            ))}
          </select>
          <select className="border p-1 rounded flex-1 text-sm" value={datasetB?.id || ""} onChange={(e) => {
            const d = datasets.find(x => x.id === e.target.value); setDatasetB(d || null);
          }}>
            <option value="">Select Dataset B</option>
            {datasets.map((d) => (
              <option key={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        {/* Method and math */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span>Method:</span>
          {["multiply", "ratio", "sum", "difference"].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m as any)}
              className={`px-2 py-1 border rounded ${method === m ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            >
              {m}
            </button>
          ))}
          <label className="ml-3 flex items-center gap-1">
            <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} /> Use scalar
            <input
              type="number"
              className="w-16 border p-1 rounded text-right"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value))}
            />
          </label>
          <button onClick={previewJoin} className="px-3 py-1 bg-blue-600 text-white rounded">Preview</button>
        </div>

        <p className="text-xs italic mb-2">
          Derived = A.{colA} {method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "-"}{" "}
          {useScalarB ? `scalar(${scalarB})` : `B.${colB}`} → {targetLevel}
        </p>

        {/* Preview table */}
        <div className="max-h-40 overflow-y-auto border rounded text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1">Pcode</th>
                <th className="p-1">Name</th>
                <th className="p-1">A</th>
                <th className="p-1">B</th>
                <th className="p-1">Derived</th>
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

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mt-4 mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 font-medium text-sm">
                <input
                  type="checkbox"
                  checked={!!taxonomy[cat]}
                  onChange={(e) => {
                    const newTax = { ...taxonomy };
                    if (e.target.checked) newTax[cat] = [];
                    else delete newTax[cat];
                    setTaxonomy(newTax);
                  }}
                />
                {cat}
              </label>
              {taxonomy[cat] && (
                <div className="ml-4 mt-1 grid grid-cols-1">
                  {categories[cat].map((t) => (
                    <label key={t} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={taxonomy[cat]?.includes(t)}
                        onChange={(e) => {
                          const newTax = { ...taxonomy };
                          if (e.target.checked)
                            newTax[cat] = [...(newTax[cat] || []), t];
                          else
                            newTax[cat] = newTax[cat].filter((x) => x !== t);
                          setTaxonomy(newTax);
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button onClick={saveDerived} className="px-3 py-1 bg-green-600 text-white rounded">
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
