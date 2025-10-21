"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Source = "core" | "other" | "derived";
type Option = { id: string; title: string; source: Source; table: string };
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

  // Load datasets
  useEffect(() => {
    const load = async () => {
      const all: Option[] = [];
      if (includeCore) {
        all.push({ id: "core-admin", title: "Administrative Boundaries [core]", source: "core", table: "admin_units" });
        all.push({ id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" });
        if (includeGIS)
          all.push({ id: "core-gis", title: "GIS Features [core]", source: "core", table: "gis_features" });
      }
      if (includeOther) {
        const { data } = await supabase.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
        if (data) data.forEach((d) => all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` }));
      }
      if (includeDerived) {
        const { data } = await supabase
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id,derived_title")
          .eq("country_iso", countryIso);
        if (data)
          data.forEach((d) =>
            all.push({
              id: d.derived_dataset_id,
              title: d.derived_title,
              source: "derived",
              table: `derived_${d.derived_dataset_id}`,
            })
          );
      }
      setDatasets(all);
    };
    if (open) load();
  }, [includeCore, includeOther, includeDerived, includeGIS, open, countryIso]);

  // Load taxonomy
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
    if (data?.length) {
      const numericKey = Object.keys(data[0]).find((k) => typeof data[0][k] === "number") || "";
      const rows = data.map((r) => ({ pcode: r.pcode, name: r.name, value: r[numericKey] }));
      side === "A" ? setPreviewA(rows) : setPreviewB(rows);
    }
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

  // Save derived
  const saveDerived = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .insert({
        country_iso: countryIso,
        title,
        description: desc,
        admin_level: targetLevel,
        taxonomy_categories: Object.keys(taxonomy).join(","),
        taxonomy_terms: Object.values(taxonomy).flat().join(","),
        formula: `${colA} ${method} ${useScalarB ? scalarB : colB}`,
      })
      .select()
      .single();

    if (error) return alert("Save failed: " + error.message);

    try {
      await supabase.rpc("create_derived_dataset", { p_derived_id: data.id });
    } catch {
      /* ignore missing RPC */
    }

    alert("Derived dataset created successfully.");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-5xl rounded-lg p-5 shadow-lg overflow-y-auto max-h-[90vh] text-sm">
        <h2 className="text-lg font-semibold mb-2">Create Derived Dataset</h2>

        {/* Toggles (type-safe map fix) */}
        <div className="flex flex-wrap gap-4 mb-3">
          {[
            { label: "Include Core", val: includeCore, set: setIncludeCore },
            { label: "Include Other", val: includeOther, set: setIncludeOther },
            { label: "Include Derived", val: includeDerived, set: setIncludeDerived },
            { label: "Include GIS", val: includeGIS, set: setIncludeGIS },
          ].map((t) => (
            <label key={t.label} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={t.val}
                onChange={(e) => t.set(e.target.checked)}
              />{" "}
              {t.label}
            </label>
          ))}
        </div>

        {/* Title + Level + Description */}
        <div className="flex gap-2 mb-3">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="border p-1 rounded"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
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

        {/* Dataset selectors */}
        <div className="flex items-start gap-2 mb-2">
          {/* Dataset A */}
          <div className="flex-1">
            <select
              className="border p-1 rounded w-full"
              value={datasetA?.id || ""}
              onChange={(e) => setDatasetA(datasets.find((x) => x.id === e.target.value) || null)}
            >
              <option value="">Select Dataset A</option>
              {["core", "other", "derived"].map((group) => (
                <optgroup key={group} label={group}>
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
            {datasetA && (
              <button
                onClick={() => peekDataset(datasetA.table, "A")}
                className="mt-1 text-xs border px-2 py-1 rounded"
              >
                peek
              </button>
            )}
            {previewA.length > 0 && (
              <div className="max-h-20 overflow-y-auto text-xs border mt-1">
                {previewA.map((r, i) => (
                  <div key={i} className="grid grid-cols-3 border-b p-1">
                    <span>{r.pcode}</span>
                    <span>{r.name}</span>
                    <span className="text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dataset B or scalar */}
          {!useScalarB && (
            <div className="flex-1">
              <select
                className="border p-1 rounded w-full"
                value={datasetB?.id || ""}
                onChange={(e) => setDatasetB(datasets.find((x) => x.id === e.target.value) || null)}
              >
                <option value="">Select Dataset B</option>
                {["core", "other", "derived"].map((group) => (
                  <optgroup key={group} label={group}>
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
              {datasetB && (
                <button
                  onClick={() => peekDataset(datasetB.table, "B")}
                  className="mt-1 text-xs border px-2 py-1 rounded"
                >
                  peek
                </button>
              )}
              {previewB.length > 0 && (
                <div className="max-h-20 overflow-y-auto text-xs border mt-1">
                  {previewB.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 border-b p-1">
                      <span>{r.pcode}</span>
                      <span>{r.name}</span>
                      <span className="text-right">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 mt-5">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={useScalarB}
                onChange={(e) => setUseScalarB(e.target.checked)}
              />{" "}
              Use scalar
            </label>
            <input
              type="number"
              className="w-20 border p-1 rounded text-right"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Method */}
        <div className="flex items-center gap-2 mb-3">
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
          <button onClick={previewJoin} className="px-3 py-1 bg-blue-600 text-white rounded ml-auto">
            Preview
          </button>
        </div>

        <p className="text-xs italic mb-2">
          Derived = A.{colA}{" "}
          {method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "-"}{" "}
          {useScalarB ? `scalar(${scalarB})` : `B.${colB}`} → {targetLevel}
        </p>

        {/* Preview Table */}
        <div className="max-h-40 overflow-y-auto border rounded text-xs mb-3">
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
        <h3 className="text-sm font-semibold mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 font-medium text-sm">
                <input
                  type="checkbox"
                  checked={!!taxonomy[cat]}
                  onChange={(e) => {
                    const t = { ...taxonomy };
                    if (e.target.checked) t[cat] = [];
                    else delete t[cat];
                    setTaxonomy(t);
                  }}
                />{" "}
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
                          const nt = { ...taxonomy };
                          if (e.target.checked) nt[cat] = [...(nt[cat] || []), t];
                          else nt[cat] = nt[cat].filter((x) => x !== t);
                          setTaxonomy(nt);
                        }}
                      />{" "}
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
