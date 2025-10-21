"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  countryIso,
  onClose,
  onCreated,
}: {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [a, setA] = useState<any>(null);
  const [b, setB] = useState<any>(null);
  const [colsA, setColsA] = useState<string[]>([]);
  const [colsB, setColsB] = useState<string[]>([]);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [rows, setRows] = useState<any[]>([]);
  const [method, setMethod] = useState("ratio");
  const [useScalar, setUseScalar] = useState(true);
  const [scalar, setScalar] = useState(5.1);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ title: "", desc: "", admin: "ADM4" });
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [taxTerms, setTaxTerms] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load datasets and taxonomy
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: tdata } = await supabase
        .from("taxonomy_terms")
        .select("category,name")
        .order("category")
        .order("name");
      const grouped: Record<string, string[]> = {};
      (tdata || []).forEach((t) => {
        grouped[t.category] = grouped[t.category] || [];
        grouped[t.category].push(t.name);
      });
      setTaxTerms(grouped);

      const list = [
        { id: "core-pop", title: "Population Data", table_name: "population_data" },
        { id: "other-hh", title: "Avg HH Size", table_name: "avg_hh_size" },
      ];
      setDatasets(list);
    })();
  }, [open]);

  async function fetchCols(ds: any, setCols: (v: string[]) => void) {
    if (!ds) return;
    const { data } = await supabase.from(ds.table_name).select("*").limit(1);
    if (data && data[0]) setCols(Object.keys(data[0]));
  }

  async function previewJoin() {
    if (!a) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: a.table_name,
      p_table_b: b?.table_name ?? "__scalar__",
      p_country: countryIso,
      p_target_level: meta.admin,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalar,
      p_scalar_b_val: scalar,
    });
    setLoading(false);
    if (error) console.error(error);
    else setRows(data || []);
  }

  function toggleTerm(cat: string, term: string) {
    setTaxonomy((prev) => {
      const curr = new Set(prev[cat] || []);
      curr.has(term) ? curr.delete(term) : curr.add(term);
      return { ...prev, [cat]: [...curr] };
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[900px] max-h-[90vh] overflow-y-auto p-4 text-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-base">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input placeholder="Title" value={meta.title}
            onChange={e => setMeta({ ...meta, title: e.target.value })}
            className="border p-1 rounded text-xs" />
          <select value={meta.admin}
            onChange={e => setMeta({ ...meta, admin: e.target.value })}
            className="border p-1 rounded text-xs">
            <option>ADM4</option><option>ADM3</option><option>ADM2</option>
          </select>
          <input placeholder="Description" value={meta.desc}
            onChange={e => setMeta({ ...meta, desc: e.target.value })}
            className="border p-1 rounded text-xs" />
        </div>

        {/* Dataset selectors */}
        <div className="flex gap-2 mb-2">
          <select
            className="border p-1 rounded w-1/2 text-xs"
            onChange={(e) => {
              const ds = datasets.find((d) => d.id === e.target.value);
              setA(ds);
              fetchCols(ds, setColsA);
            }}
          >
            <option value="">Select Dataset A</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>

          <select
            className="border p-1 rounded w-1/2 text-xs"
            onChange={(e) => {
              const ds = datasets.find((d) => d.id === e.target.value);
              setB(ds);
              fetchCols(ds, setColsB);
            }}
          >
            <option value="">Select Dataset B</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>

        {/* Column dropdowns */}
        <div className="flex gap-2 mb-3">
          <select value={colA} onChange={(e) => setColA(e.target.value)} className="border p-1 rounded text-xs w-1/2">
            {colsA.map((c) => <option key={c}>{c}</option>)}
          </select>
          {!useScalar && (
            <select value={colB} onChange={(e) => setColB(e.target.value)} className="border p-1 rounded text-xs w-1/2">
              {colsB.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Join config */}
        <div className="flex flex-wrap gap-2 items-center mb-1">
          <label className="text-xs">Method:</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="border p-1 rounded text-xs">
            <option value="sum">Sum</option>
            <option value="multiply">Multiply</option>
            <option value="ratio">Ratio</option>
            <option value="difference">Difference</option>
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} /> Use scalar
          </label>
          {useScalar && (
            <input type="number" value={scalar} onChange={(e) => setScalar(parseFloat(e.target.value))}
              className="border p-1 rounded w-20 text-xs" />
          )}
          <button onClick={previewJoin}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
            {loading ? "Loading..." : "Preview"}
          </button>
        </div>

        {/* Math display */}
        <p className="text-xs italic text-gray-600 mb-2">
          Derived = A.{colA} {method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "–"}{" "}
          {useScalar ? scalar : `B.${colB}`} → {meta.admin}
        </p>

        {/* Preview table - limited height */}
        {rows.length > 0 && (
          <div className="border rounded mb-3 max-h-[200px] overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr><th className="p-1">Pcode</th><th className="p-1">Name</th><th className="p-1">A</th><th className="p-1">B</th><th className="p-1">Derived</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-1">{r.out_pcode}</td>
                    <td className="p-1">{r.place_name}</td>
                    <td className="p-1">{r.a}</td>
                    <td className="p-1">{r.b}</td>
                    <td className="p-1">{r.derived}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Taxonomy accordion */}
        <div className="border rounded p-2 mb-3">
          <div className="font-semibold text-xs mb-1">Assign Taxonomy</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(taxTerms).map(([cat, terms]) => (
              <div key={cat}>
                <button onClick={() => setExpanded(expanded === cat ? null : cat)}
                  className="font-medium text-xs w-full text-left py-0.5 hover:text-blue-700">
                  {cat} {expanded === cat ? "▾" : "▸"}
                </button>
                {expanded === cat && (
                  <div className="pl-2 space-y-0.5 mt-1">
                    {terms.map((t) => (
                      <label key={t} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={taxonomy[cat]?.includes(t)}
                          onChange={() => toggleTerm(cat, t)}
                        />{t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded text-xs">Cancel</button>
          <button onClick={() => { onCreated?.(); onClose(); }}
            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
