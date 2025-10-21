"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";
type Source = "core" | "other" | "derived";
type DatasetOption = { id: string; title: string; admin_level?: string | null; source: Source; table_name: string };
type JoinPreviewRow = { pcode: string; name: string; a: number | null; b: number | null; derived: number | null };

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
  if (!open) return null;
  const ref = useRef<HTMLDivElement>(null);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setA] = useState<DatasetOption | null>(null);
  const [datasetB, setB] = useState<DatasetOption | null>(null);
  const [joinA, setJoinA] = useState("pcode");
  const [joinB, setJoinB] = useState("pcode");
  const [target, setTarget] = useState("ADM4");
  const [method, setMethod] = useState<Method>("multiply");
  const [core, setCore] = useState(true);
  const [other, setOther] = useState(true);
  const [derived, setDerived] = useState(true);
  const [gis, setGis] = useState(true);
  const [useScalar, setUseScalar] = useState(false);
  const [scalar, setScalar] = useState<number | null>(5.1);
  const [warn, setWarn] = useState<string | null>(null);
  const [load, setLoad] = useState(false);
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [rowsA, setRowsA] = useState<any[]>([]);
  const [rowsB, setRowsB] = useState<any[]>([]);
  const [rows, setRows] = useState<JoinPreviewRow[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState("");
  const [indicator, setInd] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const merged: DatasetOption[] = [];
      if (core)
        merged.push(
          { id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", source: "core", table_name: "admin_units" },
          { id: "core-pop", title: "Population Data", admin_level: "ADM4", source: "core", table_name: "population_data" },
          ...(gis ? [{ id: "core-gis", title: "GIS Features", admin_level: "ADM4", source: "core", table_name: "gis_features" }] : [])
        );
      if (other) {
        const { data } = await supabase.from("dataset_metadata").select("id,title,admin_level").eq("country_iso", countryIso);
        if (data)
          merged.push(
            ...data.map((d: any) => ({
              id: d.id,
              title: d.title || "(Untitled)",
              admin_level: d.admin_level,
              source: "other",
              table_name: (d.title || `dataset_${d.id}`).replace(/\s+/g, "_").toLowerCase(),
            }))
          );
      }
      if (derived) {
        const { data } = await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso);
        if (data)
          merged.push(
            ...data.map((d: any) => ({
              id: d.derived_dataset_id,
              title: d.derived_title,
              admin_level: d.admin_level,
              source: "derived",
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
      }
      setDatasets(merged);
    })();
  }, [countryIso, core, other, derived, gis]);

  const loadPreview = async (tbl: string, setter: (r: any[]) => void) => {
    const { data } = await supabase.from(tbl).select("*").limit(10);
    setter(data || []);
  };
  useEffect(() => {
    if (showA && datasetA) loadPreview(datasetA.table_name, setRowsA);
  }, [showA, datasetA]);
  useEffect(() => {
    if (!useScalar && showB && datasetB) loadPreview(datasetB.table_name, setRowsB);
  }, [showB, datasetB, useScalar]);

  const handlePreviewJoin = async () => {
    if (!datasetA || (!datasetB && !useScalar)) return;
    setLoad(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name,
      p_table_b: useScalar ? "__scalar__" : datasetB?.table_name ?? null,
      p_join_a: joinA,
      p_join_b: joinB,
      p_country: countryIso,
      p_target_level: target,
      p_method: method,
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: scalar,
    });
    if (error) {
      console.error(error);
      setLoad(false);
      return;
    }
    setRows((data || []).map((r: any) => ({ pcode: r.pcode, name: r.name, a: r.a, b: r.b, derived: r.derived })));
    setShowJoin(true);
    setLoad(false);
  };

  const grouped = useMemo(
    () => ({
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    }),
    [datasets]
  );

  const renderMini = (rows: any[]) => (
    <div className="mt-2 border rounded p-2 text-xs max-h-40 overflow-auto">
      {rows.length === 0 ? (
        <div className="italic text-gray-500">[dataset preview]</div>
      ) : (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              {Object.keys(rows[0])
                .slice(0, 3)
                .map((k) => (
                  <th key={k} className="p-1 border text-left capitalize">
                    {k}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((r, i) => (
              <tr key={i} className="border-b">
                {Object.keys(r)
                  .slice(0, 3)
                  .map((k) => (
                    <td key={k} className="p-1 border">
                      {String(r[k] ?? "")}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div ref={ref} onClick={(e) => e.target === ref.current && onClose()} className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
            <p className="text-xs text-gray-600">Step 1 Join → Step 2 Derivation</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">
          {warn && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{warn}</span>
            </div>
          )}

          {/* Dataset selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset A</label>
              <select className="w-full border rounded p-2 text-sm mt-1" value={datasetA?.id || ""} onChange={(e) => setA(datasets.find((d) => d.id === e.target.value) || null)}>
                <option value="">Select dataset…</option>
                {(["core", "other", "derived"] as const).map((k) => (
                  <optgroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}>
                    {grouped[k].map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button onClick={() => setShowA((p) => !p)} className="text-xs text-blue-600 underline mt-2" disabled={!datasetA}>
                {showA ? "Hide preview" : "Show preview"}
              </button>
              {showA && renderMini(rowsA)}
            </div>

            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset B</label>
              <label className="text-xs flex items-center gap-1 float-right">
                <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />Use scalar for B
              </label>
              {useScalar ? (
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" step="any" className="border rounded px-2 py-1 text-sm w-24" value={scalar ?? ""} onChange={(e) => setScalar(e.target.value === "" ? null : Number(e.target.value))} />
                  <span className="text-xs text-gray-500">Example: Avg HH Size</span>
                </div>
              ) : (
                <>
                  <select className="w-full border rounded p-2 text-sm mt-1" value={datasetB?.id || ""} onChange={(e) => setB(datasets.find((d) => d.id === e.target.value) || null)}>
                    <option value="">Select dataset…</option>
                    {(["core", "other", "derived"] as const).map((k) => (
                      <optgroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}>
                        {grouped[k].map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button onClick={() => setShowB((p) => !p)} className="text-xs text-blue-600 underline mt-2" disabled={!datasetB}>
                    {showB ? "Hide preview" : "Show preview"}
                  </button>
                  {showB && renderMini(rowsB)}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`px-3 py-1 rounded text-xs ${method === m ? "bg-blue-600 text-white" : "border hover:bg-gray-50"}`}>
                {m}
              </button>
            ))}
            <button onClick={handlePreviewJoin} disabled={load || !datasetA || (!datasetB && !useScalar)} className="ml-auto border rounded px-3 py-1 text-xs hover:bg-gray-50">
              {load ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Generating…</> : "Preview join"}
            </button>
          </div>

          {showJoin && (
            <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-96">
              <table className="min-w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="p-1 border">PCode</th><th className="p-1 border">Name</th><th className="p-1 border">A</th><th className="p-1 border">B</th><th className="p-1 border">Derived</th></tr>
                </thead>
                <tbody>{rows.slice(0, 100).map((r, i) => (<tr key={i} className="border-b hover:bg-gray-50"><td className="p-1">{r.pcode}</td><td className="p-1">{r.name}</td><td className="p-1 text-right">{r.a ?? "—"}</td><td className="p-1 text-right">{r.b ?? "—"}</td><td className="p-1 text-right">{r.derived ?? "—"}</td></tr>))}</tbody>
              </table>
            </div>
          )}

          <h3 className="text-sm font-semibold mt-5 mb-1">Result Metadata</h3>
          <input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full border rounded px-3 py-2 text-sm mb-2" rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="text-xs text-gray-700 mt-1">Formula: <b>{(datasetA?.title || "A")} {method} {(useScalar ? `scalar(${scalar ?? "?"})` : datasetB?.title || "B")} → {target}</b></div>
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={onCreated} disabled={!title.trim()} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">Create</button>
        </div>
      </div>
    </div>
  );
}
