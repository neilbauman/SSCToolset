"use client";
import { useEffect, useState, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, X } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";
type Source = "core" | "other" | "derived";
type DatasetOption = { id: string; title: string; admin_level: string; source: Source; table_name: string };
type JoinRow = { out_pcode: string; place_name: string; parent_pcode: string | null; parent_name: string | null; a: number | null; b: number | null; derived: number | null; col_a_used: string | null; col_b_used: string | null };

export default function CreateDerivedDatasetWizard_JoinAware({
  open, countryIso, onClose, onCreated,
}: { open: boolean; countryIso: string; onClose: () => void; onCreated?: () => void }) {
  if (!open) return null;
  const ref = useRef<HTMLDivElement | null>(null);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setA] = useState<DatasetOption | null>(null);
  const [datasetB, setB] = useState<DatasetOption | null>(null);
  const [method, setMethod] = useState<Method>("multiply");
  const [useScalar, setUseScalar] = useState(false);
  const [scalarVal, setScalarVal] = useState("5.1");
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);
  const [joinRows, setJoinRows] = useState<JoinRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      const core: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", source: "core", table_name: "admin_units" },
        { id: "core-pop", title: "Population Data", admin_level: "ADM4", source: "core", table_name: "population_data" },
        { id: "core-gis", title: "GIS Features", admin_level: "ADM4", source: "core", table_name: "gis_features" },
      ];
      const { data: md } = await supabase.from("dataset_metadata").select("id,title,admin_level").eq("country_iso", countryIso);
      const other = (md || []).map((d: any) => ({
        id: d.id, title: d.title || "(Untitled)", admin_level: d.admin_level || "ADM4",
        source: "other" as const, table_name: (d.title || `dataset_${d.id}`).replace(/\s+/g, "_").toLowerCase(),
      }));
      const { data: dv } = await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso);
      const derived = (dv || []).map((d: any) => ({
        id: d.derived_dataset_id, title: d.derived_title, admin_level: d.admin_level || "ADM4",
        source: "derived" as const, table_name: `derived_${d.derived_dataset_id}`,
      }));
      if (!stop) setDatasets([...core, ...other, ...derived]);
    })();
    return () => { stop = true; };
  }, [countryIso]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const symbol = { multiply: "×", ratio: "/", sum: "+", difference: "−" }[method];
  async function fetchPreview(ds: DatasetOption, setter: (v: any[]) => void) {
    const { data } = await supabase.from(ds.table_name).select("*").eq("country_iso", countryIso).limit(10);
    setter(data || []);
  }
  async function previewJoin() {
    if (!datasetA) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name,
      p_table_b: datasetB ? datasetB.table_name : "__scalar__",
      p_country: countryIso,
      p_target_level: "ADM4",
      p_method: method,
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: Number(scalarVal),
    });
    if (!error && data) setJoinRows(data as JoinRow[]);
    setLoading(false);
  }
  const TablePreview = ({ rows }: { rows: any[] }) => {
    if (!rows?.length) return <p className="text-xs text-gray-500 italic">No preview.</p>;
    const cols = Object.keys(rows[0]).slice(0, 4);
    return (
      <div className="overflow-auto max-h-40 border rounded text-xs">
        <table className="min-w-full border-collapse">
          <thead><tr className="bg-gray-50">{cols.map((c) => <th key={c} className="p-1 border text-left">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-t">{cols.map((c) => <td key={c} className="p-1 border">{String(r[c])}</td>)}</tr>))}</tbody>
        </table>
      </div>
    );
  };

  return (
    <div ref={ref} className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === ref.current && onClose()}>
      <div className="bg-white w-full max-w-6xl rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center border-b p-3">
          <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-700" /></button>
        </div>
        <div className="p-4 space-y-3 text-sm max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              ["Dataset A", datasetA, setA, previewA, setPreviewA],
              ["Dataset B", datasetB, setB, previewB, setPreviewB],
            ] as [string, DatasetOption | null, (d: DatasetOption | null) => void, any[], (v: any[]) => void][]).map(
              ([label, ds, setDs, rows, setRows], idx) => (
                <div key={label} className="border rounded p-2">
                  <label className="text-xs font-semibold">{label}</label>
                  <select className="w-full border rounded p-1 text-xs mt-1"
                    value={ds?.id || ""}
                    onChange={(e) => {
                      const sel = datasets.find((d) => d.id === e.target.value) || null;
                      setDs(sel);
                      if (sel) fetchPreview(sel, setRows);
                    }}>
                    <option value="">Select dataset…</option>
                    {datasets.map((d) => (<option key={d.id} value={d.id}>{d.title} ({d.source})</option>))}
                  </select>
                  {idx === 1 && (
                    <label className="flex items-center gap-1 text-xs mt-1">
                      <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />
                      Use scalar {useScalar && <input value={scalarVal} onChange={(e) => setScalarVal(e.target.value)} className="border rounded px-1 w-16 text-xs" />}
                    </label>
                  )}
                  <div className="mt-2"><TablePreview rows={rows} /></div>
                </div>
              )
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs">Method:</span>
            {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`px-2 py-0.5 rounded text-xs border ${m === method ? "bg-blue-600 text-white" : "bg-white"}`}>{m}</button>
            ))}
            <button onClick={previewJoin} disabled={loading || !datasetA} className="ml-auto text-xs px-3 py-1 border rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Preview Join"}
            </button>
          </div>
          <p className="text-xs italic text-gray-600">Derived = A.population {symbol} {useScalar ? scalarVal : "B.population"}</p>
          <div><label className="text-xs font-semibold">Derived Preview</label><div className="mt-1"><TablePreview rows={joinRows} /></div></div>
        </div>
        <div className="flex justify-end gap-2 border-t p-3">
          <button onClick={onClose} className="border px-3 py-1 rounded text-sm">Cancel</button>
          <button onClick={() => { if (onCreated) onCreated(); onClose(); }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Create</button>
        </div>
      </div>
    </div>
  );
}
