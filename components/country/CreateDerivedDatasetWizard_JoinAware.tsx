"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  countryIso,
  onClose
}: {
  open: boolean;
  countryIso: string;
  onClose: () => void;
}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [a, setA] = useState<any>(null);
  const [b, setB] = useState<any>(null);
  const [method, setMethod] = useState("sum");
  const [useScalar, setUseScalar] = useState(false);
  const [scalarVal, setScalarVal] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});

  // taxonomy categories and terms
  const taxoDefs = {
    Vulnerability: ["Poverty", "Disability", "HH Size"],
    Exposure: ["Flood", "Earthquake", "Conflict"],
    Capacity: ["Health", "Education", "Infrastructure"],
  };

  // load datasets
  useEffect(() => {
    if (!open) return;
    const list = [
      { id: "core-pop", title: "Population Data", source: "core", table_name: "population_data" },
      { id: "other-hh", title: "Avg HH Size", source: "other", table_name: "avg_hh_size" },
    ];
    setDatasets(list);
  }, [open]);

  async function previewJoin() {
    if (!a) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: a.table_name,
      p_table_b: b?.table_name ?? "__scalar__",
      p_country: countryIso,
      p_target_level: "ADM4",
      p_method: method,
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: scalarVal ?? 0,
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
    <div className="p-4 border rounded-lg bg-white text-sm space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-base">Create Derived Dataset</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-black text-xs">✕ Close</button>
      </div>

      {/* Dataset Selection */}
      <div className="flex gap-2">
        <select onChange={(e) => setA(datasets.find((d) => d.id === e.target.value))}
          className="border p-1 rounded w-1/2">
          <option value="">Select Dataset A</option>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>

        <select onChange={(e) => setB(datasets.find((d) => d.id === e.target.value))}
          className="border p-1 rounded w-1/2">
          <option value="">Select Dataset B</option>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>

      {/* Join Options */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs">Method:</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}
          className="border p-1 rounded text-xs">
          <option value="sum">Sum</option>
          <option value="multiply">Multiply</option>
          <option value="ratio">Ratio</option>
          <option value="difference">Difference</option>
        </select>

        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={useScalar}
            onChange={(e) => setUseScalar(e.target.checked)} /> Use scalar
        </label>
        {useScalar && (
          <input type="number" placeholder="Scalar value"
            value={scalarVal ?? ""} onChange={(e) => setScalarVal(Number(e.target.value))}
            className="border p-1 rounded w-24 text-xs" />
        )}
        <button onClick={previewJoin}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
          {loading ? "Loading..." : "Preview Join"}
        </button>
      </div>

      {/* Preview Table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-1">Pcode</th>
                <th className="p-1">Name</th>
                <th className="p-1">A</th>
                <th className="p-1">B</th>
                <th className="p-1">Derived</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-1">{r.out_pcode}</td>
                  <td className="p-1">{r.place_name}</td>
                  <td className="p-1">{r.a}</td>
                  <td className="p-1">{r.b}</td>
                  <td className="p-1 font-medium">{r.derived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Taxonomy Panel */}
      <div className="border rounded p-2">
        <div className="font-semibold text-xs mb-2">Assign Taxonomy</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(taxoDefs).map(([cat, terms]) => (
            <div key={cat}>
              <div className="font-medium text-xs mb-1">{cat}</div>
              {terms.map((t) => (
                <label key={t} className="flex items-center gap-1 text-xs">
                  <input type="checkbox"
                    checked={taxonomy[cat]?.includes(t)}
                    onChange={() => toggleTerm(cat, t)} />
                  {t}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
