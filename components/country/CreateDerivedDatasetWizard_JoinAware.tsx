"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

function Button({ children, onClick, variant = "default", size = "md", disabled = false, className = "", type = "button" }) {
  const base = "rounded px-3 py-1 text-sm font-medium transition-colors " + (disabled ? "opacity-50 cursor-not-allowed " : "cursor-pointer ");
  const variants = { default: "bg-blue-600 text-white hover:bg-blue-700", outline: "border border-gray-300 text-gray-700 hover:bg-gray-50", link: "text-blue-600 underline hover:text-blue-800" };
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-3 py-1" };
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function CreateDerivedDatasetWizard_JoinAware({ open, countryIso, onClose, onCreated }) {
  if (!open) return null;
  const ref = useRef(null);
  const [datasets, setDatasets] = useState([]), [datasetA, setA] = useState(null), [datasetB, setB] = useState(null);
  const [joinA, setJoinA] = useState("pcode"), [joinB, setJoinB] = useState("pcode"), [target, setTarget] = useState("ADM4"), [method, setMethod] = useState("multiply");
  const [loading, setLoading] = useState(false), [notice, setNotice] = useState(null), [rows, setRows] = useState([]), [show, setShow] = useState(false);
  const [core, setCore] = useState(true), [other, setOther] = useState(true), [derived, setDerived] = useState(true), [gis, setGis] = useState(true);

  useEffect(() => { const k = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const merged = [];
      if (core) {
        merged.push({ id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", dataset_type: "admin", source: "core", table_name: "admin_units" },
                    { id: "core-pop", title: "Population Data", admin_level: "ADM4", dataset_type: "population", source: "core", table_name: "population_data" });
        if (gis) merged.push({ id: "core-gis", title: "GIS Features", admin_level: "ADM4", dataset_type: "gis", source: "core", table_name: "gis_features" });
      }
      if (other) {
        const { data } = await supabase.from("dataset_metadata").select("id,title,admin_level,dataset_type").eq("country_iso", countryIso);
        if (data) merged.push(...data.map(d => ({ id: d.id, title: d.title || "(Untitled)", admin_level: d.admin_level, dataset_type: d.dataset_type, source: "other", table_name: (d.title || `dataset_${d.id}`).replace(/\s+/g, "_").toLowerCase() })));
      }
      if (derived) {
        const { data } = await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso);
        if (data) merged.push(...data.map(d => ({ id: d.derived_dataset_id, title: d.derived_title, admin_level: d.admin_level, dataset_type: "derived", source: "derived", table_name: `derived_${d.derived_dataset_id}` })));
      }
      if (!stop) setDatasets(merged);
    })();
    return () => (stop = true);
  }, [countryIso, core, other, derived, gis]);

  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const h = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"], ia = h.indexOf(datasetA.admin_level || ""), ib = h.indexOf(datasetB.admin_level || "");
    if (ia < 0 || ib < 0) return;
    const deeper = ia > ib ? datasetA.admin_level : datasetB.admin_level, higher = ia > ib ? datasetB.admin_level : datasetA.admin_level;
    setTarget(deeper ?? "ADM4");
    setNotice(deeper !== higher && deeper && higher ? `Aggregating ${deeper} → ${higher} may require summarization.` : null);
  }, [datasetA, datasetB]);

  const handlePreview = async () => {
    if (!datasetA || !datasetB) return;
    setLoading(true); setRows([]); setShow(false);
    const { data, error } = await supabase.rpc("simulate_join_preview_aggregate", { table_a: datasetA.table_name, table_b: datasetB.table_name, field_a: joinA, field_b: joinB, p_country: countryIso, target_level: target, method });
    if (error) return console.error(error), setLoading(false);
    setRows((data || []).map(r => ({ pcode: r.pcode, name: r.name, a: r.a ?? null, b: r.b ?? null, derived: r.derived ?? null })));
    setShow(true); setLoading(false);
  };

  const g = useMemo(() => ({ core: datasets.filter(d => d.source === "core"), other: datasets.filter(d => d.source === "other"), derived: datasets.filter(d => d.source === "derived") }), [datasets]);
  const clickBg = e => e.target === ref.current && onClose();

  return (
    <div ref={ref} onClick={clickBg} className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" aria-modal role="dialog">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div><h2 className="text-lg font-semibold">Create Derived Dataset</h2><p className="text-xs text-gray-600">Step 1 Join → Step 2 Derive → Step 3 Metadata</p></div>
          <button className="p-1 rounded hover:bg-gray-100" onClick={onClose}><X className="w-5 h-5 text-gray-700" /></button>
        </div>

        <div className="px-4 py-4 max-h-[78vh] overflow-y-auto text-sm">
          <div className="flex flex-wrap gap-4 mb-4">
            {[
              ["Include Core", core, setCore],
              ["Include Other", other, setOther],
              ["Include Derived", derived, setDerived],
              ["Include GIS", gis, setGis, core],
            ].map(([lbl, v, set, cond], i) => cond === false ? null : (
              <label key={i} className="flex items-center space-x-1"><input type="checkbox" checked={v} onChange={e => set(e.target.checked)} /><span>{lbl}</span></label>
            ))}
          </div>

          {notice && <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded"><AlertTriangle className="w-4 h-4 mt-[2px]" /><span>{notice}</span></div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { t: "Dataset A", d: datasetA, s: setA, f: joinA, fs: setJoinA },
              { t: "Dataset B", d: datasetB, s: setB, f: joinB, fs: setJoinB },
            ].map((x, i) => (
              <div key={i} className="border rounded-lg p-3">
                <label className="text-xs font-semibold">{x.t}</label>
                <select className="w-full border rounded p-2 text-sm mt-1" value={x.d?.id || ""} onChange={e => x.s(datasets.find(d => d.id === e.target.value) || null)}>
                  <option value="">Select dataset…</option>
                  {["Core Datasets", "Other Datasets", "Derived Datasets"].map((gname, j) => {
                    const arr = [g.core, g.other, g.derived][j];
                    return <optgroup key={j} label={gname}>{arr.map(d => <option key={d.id} value={d.id}>{d.title} {d.admin_level ? `(${d.admin_level})` : ""}</option>)}</optgroup>;
                  })}
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs">Join Field</span>
                  <select value={x.f} onChange={e => x.fs(e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="pcode">pcode</option><option value="admin_pcode">admin_pcode</option><option value="id">id</option></select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" className="text-xs" onClick={handlePreview} disabled={loading || !datasetA || !datasetB}>{loading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Generating…</> : "Preview Join"}</Button>
            <span className="text-xs text-gray-600">Target: <strong>{target}</strong></span>
          </div>

          {show && (
            <div className="mt-3 border rounded-lg p-2 bg-gray-50">
              <div className="max-h-[45vh] overflow-y-auto rounded border bg-white">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100 text-gray-600">
                    <tr><th className="p-1 border text-left">PCode</th><th className="p-1 border text-left">Name</th><th className="p-1 border text-right">A</th><th className="p-1 border text-right">B</th><th className="p-1 border text-right">Derived</th></tr>
                  </thead>
                  <tbody>{rows.slice(0, 200).map((r, i) => <tr key={i} className="border-b hover:bg-gray-50"><td className="p-1">{r.pcode}</td><td className="p-1">{r.name}</td><td className="p-1 text-right">{r.a ?? "—"}</td><td className="p-1 text-right">{r.b ?? "—"}</td><td className="p-1 text-right font-medium">{r.derived ?? "—"}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Showing ≤ 200 records (scroll).</p>
            </div>
          )}

          <h3 className="text-sm font-semibold mt-4 mb-2">Step 2 – Derivation</h3>
          <div className="text-xs mb-2"><strong>{datasetA?.title || "A"} {method} {datasetB?.title || "B"} → {target}</strong></div>
          <div className="flex flex-wrap gap-2 mb-6">{["multiply", "ratio", "sum", "difference"].map(m => <Button key={m} size="sm" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>{m}</Button>)}</div>

          <h3 className="text-sm font-semibold mb-2">Step 3 – Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div><label className="font-medium">Derived Title</label><input type="text" className="w-full border rounded px-2 py-1 mt-1" placeholder="e.g. Population Density 2025" /></div>
            <div><label className="font-medium">Year</label><input type="number" className="w-full border rounded px-2 py-1 mt-1" placeholder="2025" /></div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onCreated?.(); onClose(); }}>Create</Button>
        </div>
      </div>
    </div>
  );
}
