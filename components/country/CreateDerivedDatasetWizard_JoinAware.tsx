"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";
type Source = "core" | "other" | "derived";
type DatasetOption = { id: string; title: string; admin_level?: string | null; dataset_type?: string | null; source: Source; table_name: string; };
type JoinPreviewRow = { pcode: string; name: string; a: number | null; b: number | null; derived: number | null; };

export default function CreateDerivedDatasetWizard_JoinAware({ open, countryIso, onClose, onCreated }: { open: boolean; countryIso: string; onClose: () => void; onCreated?: () => void; }) {
  if (!open) return null;
  const ref = useRef<HTMLDivElement>(null);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setA] = useState<DatasetOption | null>(null);
  const [datasetB, setB] = useState<DatasetOption | null>(null);
  const [joinA, setJoinA] = useState("pcode"), [joinB, setJoinB] = useState("pcode");
  const [target, setTarget] = useState("ADM4"), [method, setMethod] = useState<Method>("multiply");
  const [load, setLoad] = useState(false), [warn, setWarn] = useState<string | null>(null);
  const [rows, setRows] = useState<JoinPreviewRow[]>([]), [show, setShow] = useState(false);
  const [core, setCore] = useState(true), [other, setOther] = useState(true), [derived, setDerived] = useState(true), [gis, setGis] = useState(true);
  const [useScalar, setUseScalar] = useState(false), [scalar, setScalar] = useState<number | null>(null);

  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const merged: DatasetOption[] = [];
      if (core) merged.push(
        { id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", dataset_type: "admin", source: "core" as const, table_name: "admin_units" },
        { id: "core-pop", title: "Population Data", admin_level: "ADM4", dataset_type: "population", source: "core" as const, table_name: "population_data" },
        ...(gis ? [{ id: "core-gis", title: "GIS Features", admin_level: "ADM4", dataset_type: "gis", source: "core" as const, table_name: "gis_features" }] : [])
      );
      if (other) {
        const { data } = await supabase.from("dataset_metadata").select("id,title,admin_level,dataset_type,country_iso").eq("country_iso", countryIso).order("title");
        if (data) merged.push(...data.map((d: any) => ({
          id: d.id, title: d.title || "(Untitled)", admin_level: d.admin_level, dataset_type: d.dataset_type,
          source: "other" as const, table_name: (d.title || `dataset_${d.id}`).replace(/\s+/g, "_").toLowerCase()
        })));
      }
      if (derived) {
        const { data } = await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso).order("derived_title");
        if (data) merged.push(...data.map((d: any) => ({
          id: d.derived_dataset_id, title: d.derived_title, admin_level: d.admin_level,
          dataset_type: "derived", source: "derived" as const, table_name: `derived_${d.derived_dataset_id}`
        })));
      }
      if (!stop) setDatasets(merged);
    })(); return () => { stop = true; };
  }, [countryIso, core, other, derived, gis]);

  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const lv = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const iA = lv.indexOf(datasetA.admin_level || ""), iB = lv.indexOf(datasetB.admin_level || "");
    if (iA < 0 || iB < 0) return;
    const deep = iA > iB ? datasetA.admin_level : datasetB.admin_level, high = iA > iB ? datasetB.admin_level : datasetA.admin_level;
    setTarget(deep ?? "ADM4");
    setWarn(deep !== high && deep && high ? `Aggregating ${deep} to ${high}; preview at ${deep}.` : null);
  }, [datasetA, datasetB]);

  const preview = async () => {
    if (!datasetA) return;
    setLoad(true); setShow(false);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name, p_table_b: useScalar ? null : datasetB?.table_name ?? null,
      p_join_a: joinA, p_join_b: joinB, p_country: countryIso, p_target_level: target, p_method: method,
      p_col_a: "population", p_col_b: "population", p_use_scalar_b: useScalar, p_scalar_b_val: scalar
    });
    if (error) { console.error(error); setLoad(false); return; }
    setRows((data || []).map((r: any) => ({ pcode: r.pcode, name: r.name, a: r.a, b: r.b, derived: r.derived })));
    setShow(true); setLoad(false);
  };

  const g = useMemo(() => ({ core: datasets.filter(d => d.source === "core"), other: datasets.filter(d => d.source === "other"), derived: datasets.filter(d => d.source === "derived") }), [datasets]);
  const click = (e: any) => e.target === ref.current && onClose();

  return (
    <div ref={ref} onClick={click} className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div><h2 className="text-lg font-semibold">Create Derived Dataset</h2><p className="text-xs text-gray-600">Step 1 Join → Step 2 Derivation</p></div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-700" /></button>
        </div>

        <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {[["Include Core", core, setCore], ["Include Other", other, setOther], ["Include Derived", derived, setDerived]].map(([l, v, s], i) => (
              <label key={i} className="flex items-center space-x-1"><input type="checkbox" checked={v as boolean} onChange={(e) => (s as any)(e.target.checked)} /><span>{l}</span></label>
            ))}
            {core && <label className="flex items-center space-x-1"><input type="checkbox" checked={gis} onChange={(e) => setGis(e.target.checked)} /><span>Include GIS</span></label>}
          </div>

          {warn && <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded"><AlertTriangle className="w-4 h-4 mt-[2px]" /><span>{warn}</span></div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset A</label>
              <select className="w-full border rounded p-2 text-sm mt-1" value={datasetA?.id || ""} onChange={(e) => setA(datasets.find(d => d.id === e.target.value) || null)}>
                <option value="">Select dataset…</option>
                {(["core", "other", "derived"] as const).map(k => (<optgroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}>{g[k].map(d => (<option key={d.id} value={d.id}>{d.title} {d.admin_level ? `(${d.admin_level})` : ""}</option>))}</optgroup>))}
              </select>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold">Dataset B</label>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />Use scalar for B</label>
              </div>
              {useScalar ? (
                <div className="flex items-center gap-2">
                  <input type="number" step="any" value={scalar ?? ""} onChange={(e) => setScalar(e.target.value ? Number(e.target.value) : null)} className="border rounded px-2 py-1 text-sm w-24" placeholder="e.g. 5.1" />
                  <span className="text-xs text-gray-500">Example: Avg HH Size</span>
                </div>
              ) : (
                <select className="w-full border rounded p-2 text-sm mt-1" value={datasetB?.id || ""} onChange={(e) => setB(datasets.find(d => d.id === e.target.value) || null)}>
                  <option value="">Select dataset…</option>
                  {(["core", "other", "derived"] as const).map(k => (<optgroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}>{g[k].map(d => (<option key={d.id} value={d.id}>{d.title} {d.admin_level ? `(${d.admin_level})` : ""}</option>))}</optgroup>))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <button onClick={preview} disabled={load || !datasetA || (!datasetB && !useScalar)} className="border rounded px-3 py-1 text-xs hover:bg-gray-50">
              {load ? <><Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />Generating…</> : "Preview join"}
            </button>
            <span className="text-xs text-gray-600">Target level: <strong>{target}</strong></span>
          </div>

          {show && (
            <div className="border rounded p-2 text-xs overflow-auto max-h-96">
              <table className="min-w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600"><tr><th className="p-1 border text-left">PCode</th><th className="p-1 border text-left">Name</th><th className="p-1 border text-right">A</th><th className="p-1 border text-right">B</th><th className="p-1 border text-right">Derived</th></tr></thead>
                <tbody>{rows.slice(0, 50).map((r, i) => (<tr key={i} className="border-b hover:bg-gray-50"><td className="p-1">{r.pcode}</td><td className="p-1">{r.name}</td><td className="p-1 text-right">{r.a ?? "—"}</td><td className="p-1 text-right">{r.b ?? "—"}</td><td className="p-1 text-right">{r.derived ?? "—"}</td></tr>))}</tbody>
              </table><p className="text-[10px] text-gray-500 mt-1">Showing up to 50 rows.</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onCreated?.(); onClose(); }} className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700">Create</button>
        </div>
      </div>
    </div>
  );
}
