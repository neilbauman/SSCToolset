"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Option = { id: string; title: string; source: Source; table: string };
type Props = { open: boolean; onClose: () => void; countryIso: string };

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const sb = supabaseBrowser;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [datasets, setDatasets] = useState<Option[]>([]);
  const [datasetA, setDatasetA] = useState<Option | null>(null);
  const [datasetB, setDatasetB] = useState<Option | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [include, setInclude] = useState({ core: true, other: true, derived: true, gis: true });

  useEffect(() => { if (open) loadDatasets(); }, [open, include]);
  useEffect(() => { if (open) loadTaxonomy(); }, [open]);

  async function loadDatasets() {
    const list: Option[] = [];
    if (include.core) {
      list.push({ id: "core-admin", title: "Administrative Boundaries [Core]", source: "core", table: "admin_units" });
      list.push({ id: "core-pop", title: "Population Data [Core]", source: "core", table: "population_data" });
    }
    if (include.gis)
      list.push({ id: "core-gis", title: "GIS Features [Core]", source: "gis", table: "gis_features" });
    if (include.other) {
      const { data } = await sb.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (data) data.forEach((d) =>
        list.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
      );
    }
    if (include.derived) {
      const { data } = await sb
        .from("view_derived_dataset_summary")
        .select("derived_dataset_id,derived_title,country_iso,admin_level")
        .eq("country_iso", countryIso);
      if (data)
        data.forEach((d) =>
          list.push({
            id: d.derived_dataset_id,
            title: `${d.derived_title} (${d.admin_level})`,
            source: "derived",
            table: `derived_${d.derived_dataset_id}`,
          })
        );
    }
    setDatasets(list);
  }

  async function loadTaxonomy() {
    const { data } = await sb.from("taxonomy_terms").select("category,name");
    if (!data) return;
    const grouped: Record<string, string[]> = {};
    data.forEach((t) => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t.name);
    });
    setCategories(grouped);
  }

  async function peekDataset(table: string, side: "A" | "B") {
    const { data } = await sb.from(table).select("*").limit(10);
    if (!data) return;
    const numKey = Object.keys(data[0] || {}).find((k) => typeof data[0][k] === "number");
    const rows = data.map((r) => ({
      pcode: r.pcode,
      name: r.name,
      value: numKey ? r[numKey] : null,
    }));
    if (side === "A") setPreviewA(rows);
    else setPreviewB(rows);
  }

  async function previewJoin() {
    const { data, error } = await sb.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table || "",
      p_table_b: datasetB?.table || "",
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA || "value",
      p_col_b: colB || "value",
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    if (error) return alert("Preview failed: " + error.message);
    setPreview(data || []);
  }

  async function saveDerived() {
    if (!title) return alert("Please provide a title.");
    if (preview.length === 0) return alert("Please generate a preview first.");

    const rows = preview.map((r: any) => ({
      pcode: r.out_pcode,
      name: r.place_name,
      parent_pcode: r.parent_pcode || null,
      parent_name: r.parent_name || null,
      a: r.a,
      b: r.b,
      derived: r.derived,
      col_a_used: colA,
      col_b_used: colB,
    }));

    const { error } = await sb.rpc("create_derived_dataset", {
      p_country: countryIso,
      p_title: title,
      p_admin_level: targetLevel,
      p_year: new Date().getFullYear(),
      p_method: method,
      p_sources: JSON.stringify({ a: datasetA?.title, b: datasetB?.title }),
      p_scalar_b: useScalarB ? scalarB : null,
      p_rows: rows,
    });

    if (error) return alert("Save failed: " + error.message);
    alert("Derived dataset saved and records created successfully.");
    onClose();
  }

  if (!open) return null;

  const groupedDatasets = ["core", "other", "derived", "gis"].map((group) => ({
    key: group,
    label: group.charAt(0).toUpperCase() + group.slice(1),
    options: datasets.filter((d) => d.source === group),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-[92%] max-w-6xl max-h-[90vh] overflow-y-auto p-6 text-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#640811]">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
        </div>

        {/* Title / Desc / Level */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input className="border rounded p-2 col-span-1.5" placeholder="Title"
            value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="border rounded p-2 col-span-0.5"
            value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => <option key={lvl}>{lvl}</option>)}
          </select>
          <input className="border rounded p-2 col-span-1.5" placeholder="Description"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        {/* Include toggles */}
        <div className="flex gap-4 mb-3">
          {Object.entries(include).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1">
              <input type="checkbox" checked={v} onChange={(e) => setInclude({ ...include, [k]: e.target.checked })} />
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>

        {/* Dataset selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[{ side: "A" }, { side: "B" }].map(({ side }) => (
            <div key={side} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-gray-700">Dataset {side}</label>
                <button
                  onClick={() => {
                    const table = side === "A" ? datasetA?.table : datasetB?.table;
                    if (table) peekDataset(table, side as "A" | "B");
                  }}
                  className="text-xs border px-2 py-1 rounded hover:bg-gray-100"
                >
                  Peek
                </button>
              </div>
              <select
                className="border rounded p-2 w-full mb-2"
                value={side === "A" ? datasetA?.id || "" : datasetB?.id || ""}
                onChange={(e) => {
                  const sel = datasets.find((x) => x.id === e.target.value) || null;
                  side === "A" ? setDatasetA(sel) : setDatasetB(sel);
                }}
              >
                <option value="">Select dataset...</option>
                {groupedDatasets.map((group) => (
                  <optgroup key={group.key} label={group.label} style={{ color: "#666" }}>
                    {group.options.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {(side === "A" ? previewA : previewB).length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs border rounded">
                  {(side === "A" ? previewA : previewB).map((r, i) => (
                    <div key={i} className="grid grid-cols-3 border-b p-1">
                      <span>{r.pcode}</span>
                      <span>{r.name}</span>
                      <span className="text-right">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Method controls */}
        <div className="flex items-center gap-3 mb-4">
          <select className="border rounded p-2" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["ratio", "multiply", "sum", "difference"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="border rounded p-2" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))}>
            {[0, 1, 2].map((n) => <option key={n}>{n} decimals</option>)}
          </select>
          <label className="flex items-center gap-1 ml-4">
            <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} />
            Scalar B
          </label>
          {useScalarB && (
            <input
              type="number"
              className="border rounded p-1 w-20 text-right"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value))}
            />
          )}
          <button
            onClick={previewJoin}
            className="ml-auto px-4 py-1.5 bg-[#640811] text-white rounded hover:bg-[#50060d]"
          >
            Preview
          </button>
        </div>

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="max-h-60 overflow-y-auto border rounded mb-4 text-xs">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr><th>Pcode</th><th>Name</th><th>A</th><th>B</th><th>Derived</th></tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td>{r.out_pcode}</td>
                    <td>{r.place_name}</td>
                    <td className="text-right">{r.a}</td>
                    <td className="text-right">{r.b}</td>
                    <td className="text-right">{Number(r.derived).toFixed(decimals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 font-medium text-[13px] text-gray-700">
                <input
                  type="checkbox"
                  checked={!!taxonomy[cat]}
                  onChange={(e) => {
                    const t = { ...taxonomy };
                    if (e.target.checked) t[cat] = [];
                    else delete t[cat];
                    setTaxonomy(t);
                  }}
                /> {cat}
              </label>
              {taxonomy[cat] && (
                <div className="ml-4 mt-1 grid grid-cols-1">
                  {categories[cat].map((term) => (
                    <label key={term} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={taxonomy[cat]?.includes(term)}
                        onChange={(e) => {
                          const t = { ...taxonomy };
                          if (e.target.checked) t[cat] = [...(t[cat] || []), term];
                          else t[cat] = t[cat].filter((x) => x !== term);
                          setTaxonomy(t);
                        }}
                      /> {term}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-1.5 border rounded text-sm">Cancel</button>
          <button
            onClick={saveDerived}
            className="px-4 py-1.5 bg-[#00b398] text-white rounded text-sm hover:bg-[#00957e]"
          >
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
