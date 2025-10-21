"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X, Divide, Plus, Minus, Asterisk } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";
type Source = "core" | "other" | "derived";
type DatasetOption = { id: string; title: string; admin_level?: string | null; source: Source; table_name: string };
type JoinRow = { pcode: string; name: string; a?: number; b?: number; derived?: number };

export default function CreateDerivedDatasetWizard_JoinAware({
  open, countryIso, onClose, onCreated,
}: { open: boolean; countryIso: string; onClose: () => void; onCreated?: () => void }) {
  if (!open) return null;
  const ref = useRef<HTMLDivElement>(null);

  const [core, setCore] = useState(true);
  const [includeGis, setIncludeGis] = useState(true);
  const [other, setOther] = useState(true);
  const [derived, setDerived] = useState(true);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setA] = useState<DatasetOption | null>(null);
  const [datasetB, setB] = useState<DatasetOption | null>(null);
  const [method, setMethod] = useState<Method>("ratio");
  const [target] = useState("ADM4");
  const [useScalar, setUseScalar] = useState(false);
  const [scalar, setScalar] = useState<number | null>(5.1);
  const [rowsA, setRowsA] = useState<any[]>([]);
  const [rowsB, setRowsB] = useState<any[]>([]);
  const [rows, setRows] = useState<JoinRow[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const merged: DatasetOption[] = [];
      if (core) {
        merged.push(
          { id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", source: "core" as const, table_name: "admin_units" },
          { id: "core-pop", title: "Population Data", admin_level: "ADM4", source: "core" as const, table_name: "population_data" }
        );
        if (includeGis)
          merged.push({ id: "core-gis", title: "GIS Features", admin_level: "ADM4", source: "core" as const, table_name: "gis_features" });
      }
      if (other) {
        const { data } = await supabase.from("dataset_metadata").select("id,title,admin_level").eq("country_iso", countryIso);
        if (data)
          merged.push(...data.map((d: any) => ({
            id: d.id,
            title: d.title || "(Untitled)",
            admin_level: d.admin_level,
            source: "other" as const,
            table_name: (d.title || `dataset_${d.id}`).replace(/\s+/g, "_").toLowerCase(),
          })));
      }
      if (derived) {
        const { data } = await supabase.from("view_derived_dataset_summary")
          .select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso);
        if (data)
          merged.push(...data.map((d: any) => ({
            id: d.derived_dataset_id,
            title: d.derived_title,
            admin_level: d.admin_level,
            source: "derived" as const,
            table_name: `derived_${d.derived_dataset_id}`,
          })));
      }
      setDatasets(merged);
    })();
  }, [countryIso, core, other, derived, includeGis]);

  const previewMini = async (tbl: string, setter: (r: any[]) => void) => {
    const { data, error } = await supabase.from(tbl).select("pcode,name,population,value").limit(5);
    setter(error ? [] : data || []);
  };
  useEffect(() => { if (showA && datasetA) previewMini(datasetA.table_name, setRowsA); }, [showA, datasetA]);
  useEffect(() => { if (showB && datasetB && !useScalar) previewMini(datasetB.table_name, setRowsB); }, [showB, datasetB, useScalar]);

  const handlePreviewJoin = async () => {
    if (!datasetA || (!datasetB && !useScalar)) return;
    setLoading(true); setWarn(null);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name,
      p_table_b: useScalar ? "__scalar__" : datasetB?.table_name ?? null,
      p_country: countryIso,
      p_target_level: target,
      p_method: method,
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: scalar,
    });
    if (error || !data?.length) setWarn("Join preview failed. Check Supabase function or dataset alignment.");
    else setRows(data);
    setShowJoin(true);
    setLoading(false);
  };

  const grouped = useMemo(() => ({
    core: datasets.filter((d) => d.source === "core"),
    other: datasets.filter((d) => d.source === "other"),
    derived: datasets.filter((d) => d.source === "derived"),
  }), [datasets]);

  const renderMini = (rows: any[]) =>
    rows.length === 0 ? (
      <div className="italic text-gray-500 text-xs mt-1">[dataset preview]</div>
    ) : (
      <table className="w-full border text-xs mt-2">
        <thead className="bg-gray-50 text-gray-600">
          <tr>{Object.keys(rows[0]).slice(0, 3).map((k) => <th key={k} className="border p-1 text-left">{k}</th>)}</tr>
        </thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>{Object.keys(r).slice(0, 3).map((k) => <td key={k} className="border p-1">{String(r[k] ?? "")}</td>)}</tr>
        ))}</tbody>
      </table>
    );

  const icons: Record<Method, JSX.Element> = {
    multiply: <Asterisk className="w-4 h-4" />, ratio: <Divide className="w-4 h-4" />,
    sum: <Plus className="w-4 h-4" />, difference: <Minus className="w-4 h-4" />,
  };

  return (
    <div ref={ref} onClick={(e) => e.target === ref.current && onClose()} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center border-b px-4 py-2">
          <div><h2 className="text-lg font-semibold">Create Derived Dataset</h2><p className="text-xs text-gray-600">Step 1 Join → Step 2 Derivation</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-700" /></button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {warn && <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded flex gap-2 items-center"><AlertTriangle className="w-4 h-4" />{warn}</div>}

          {/* Source Toggles */}
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {([
              ["Include Core", core, setCore],
              ["Include GIS", includeGis, setIncludeGis],
              ["Include Other", other, setOther],
              ["Include Derived", derived, setDerived],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, val, fn], i) => (
              <label key={i} className="flex items-center gap-1"><input type="checkbox" checked={val} onChange={(e) => fn(e.target.checked)} />{label}</label>
            ))}
          </div>

          {/* Dataset A and B */}
          {( [
            ["Dataset A", datasetA, setA, showA, setShowA, rowsA],
            ["Dataset B", datasetB, setB, showB, setShowB, rowsB],
          ] as [string, DatasetOption | null, (v: DatasetOption | null) => void, boolean, (v: boolean) => void, any[]][]).map(
            ([label, ds, setDs, show, setShow, data], idx) => (
              <div key={idx} className="border rounded p-3 mb-3">
                <label className="text-xs font-semibold">{label}</label>
                {idx === 1 && (
                  <label className="text-xs flex items-center gap-1 float-right">
                    <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />Use scalar for B
                  </label>
                )}
                {idx === 1 && useScalar ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" step="any" className="border rounded px-2 py-1 text-sm w-24"
                      value={scalar ?? ""} onChange={(e) => setScalar(e.target.value === "" ? null : Number(e.target.value))} />
                    <span className="text-xs text-gray-500">Example: Avg HH Size</span>
                  </div>
                ) : (
                  <>
                    <select className="w-full border rounded p-2 text-sm mt-1"
                      value={ds?.id || ""}
                      onChange={(e) => setDs(datasets.find((d) => d.id === e.target.value) || null)}>
                      <option value="">Select dataset…</option>
                      {(["core", "other", "derived"] as const).map((k) => (
                        <optgroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}>
                          {grouped[k].map((d) => <option key={d.id} value={d.id}>{d.title}{d.admin_level ? ` (${d.admin_level})` : ""}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <button onClick={() => setShow(!show)} className="text-xs text-blue-600 underline mt-2" disabled={!ds}>
                      {show ? "Hide preview" : "Show preview"}
                    </button>
                    {show && renderMini(data)}
                  </>
                )}
              </div>
            )
          )}

          {/* Math visualization */}
          <div className="flex items-center gap-3 my-3 text-sm text-gray-700 justify-center">
            <span className="font-medium">{datasetA?.title || "A"}</span>
            {icons[method]}
            <span className="font-medium">{useScalar ? `scalar(${scalar ?? "?"})` : datasetB?.title || "B"}</span>
            <span className="text-gray-500">→</span>
            <span className="font-medium">{target}</span>
          </div>

          {/* Method Buttons */}
          <div className="flex flex-wrap gap-3 mb-3">
            {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`px-3 py-1 rounded text-xs ${method===m?"bg-blue-600 text-white":"border hover:bg-gray-50"}`}>{m}</button>
            ))}
            <button onClick={handlePreviewJoin} disabled={loading || !datasetA || (!datasetB && !useScalar)}
              className="ml-auto border rounded px-3 py-1 text-xs hover:bg-gray-50">
              {loading ? (<><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Generating…</>) : "Preview join"}
            </button>
          </div>

          {/* Result Table (A/B side-by-side) */}
          {showJoin && (
            <div className="border rounded p-2 text-xs overflow-auto max-h-80">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="p-1 border">PCode</th><th className="p-1 border">Name</th><th className="p-1 border text-right">A</th><th className="p-1 border text-right">B</th><th className="p-1 border text-right">Derived</th></tr>
                </thead>
                <tbody>{rows.slice(0,100).map((r,i)=>(<tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-1">{r.pcode}</td><td className="p-1">{r.name}</td>
                  <td className="p-1 text-right">{r.a??"—"}</td><td className="p-1 text-right">{r.b??"—"}</td>
                  <td className="p-1 text-right font-medium">{r.derived??"—"}</td></tr>))}</tbody>
              </table>
            </div>
          )}

          {/* Metadata */}
          <h3 className="text-sm font-semibold mt-5 mb-1">Result Metadata</h3>
          <input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Title"
            value={title} onChange={(e)=>setTitle(e.target.value)} />
          <textarea className="w-full border rounded px-3 py-2 text-sm mb-2" rows={2} placeholder="Notes"
            value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={onCreated} disabled={!title.trim()} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">Create</button>
        </div>
      </div>
    </div>
  );
}
