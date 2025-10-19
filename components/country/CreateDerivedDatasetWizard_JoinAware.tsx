"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetInfo = {
  id: string;
  title: string;
  dataset_type: string;
  source_table: string;
  join_field: string;
  admin_level: string | null;
  data_format?: string | null;
  record_count?: number | null;
  year?: number | null;
};
type Props = { open: boolean; onClose: () => void; countryIso: string; onCreated?: (id?: string) => void };
type Method = "multiply" | "ratio" | "sum" | "difference" | "aggregate" | "custom";
const SCALAR = "<SCALAR>";

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso, onCreated }: Props) {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [aId, setAId] = useState(""), [bId, setBId] = useState("");
  const [aMeta, setAMeta] = useState<DatasetInfo | null>(null), [bMeta, setBMeta] = useState<DatasetInfo | null>(null);
  const [aScalar, setAScalar] = useState(false), [bScalar, setBScalar] = useState(false);
  const [aVal, setAVal] = useState<number | null>(null), [bVal, setBVal] = useState<number | null>(null);
  const [joinA, setJoinA] = useState("pcode"), [joinB, setJoinB] = useState("pcode");
  const [fieldsA, setFieldsA] = useState<string[]>([]), [fieldsB, setFieldsB] = useState<string[]>([]);
  const [target, setTarget] = useState("ADM3"), [method, setMethod] = useState<Method>("multiply");
  const [round, setRound] = useState(0), [unit, setUnit] = useState(""), [title, setTitle] = useState("");
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(false), [warn, setWarn] = useState<string | null>(null);

  /** Load available datasets **/
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-country-datasets?iso=${countryIso}`;
        const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (r.ok) {
          const j = await r.json();
          setDatasets(j.datasets || []);
        } else {
          const { data } = await supabase.from("dataset_metadata")
            .select("id,title,dataset_type,admin_level,record_count,year")
            .eq("country_iso", countryIso);
          setDatasets((data || []).map((d: any) => ({
            id: d.id, title: d.title, dataset_type: d.dataset_type ?? "other",
            source_table: "dataset_values", join_field: "pcode", admin_level: d.admin_level,
            record_count: d.record_count, year: d.year,
          })));
        }
      } catch { setDatasets([]); }
    })();
  }, [open, countryIso]);

  useEffect(() => { setAMeta(datasets.find(d => d.id === aId) || null); }, [aId, datasets]);
  useEffect(() => { setBMeta(datasets.find(d => d.id === bId) || null); }, [bId, datasets]);

  /** Dynamically get joinable fields based on dataset type **/
  async function getColumns(meta: DatasetInfo | null): Promise<string[]> {
    if (!meta) return [];
    let table = meta.source_table || "dataset_values";
    if (meta.dataset_type === "population") table = "population_data";
    else if (meta.dataset_type === "admin") table = "admin_units";
    else if (meta.dataset_type === "gis") table = "gis_layers";
    try {
      const { data, error } = await supabase
        .from("information_schema.columns")
        .select("column_name,data_type")
        .eq("table_name", table);
      if (error || !data) throw error;
      return data.filter((c: any) => c.data_type.includes("char") || c.data_type.includes("text")).map((c: any) => c.column_name);
    } catch {
      return ["pcode", "admin_pcode", "adm_code", "id"];
    }
  }

  useEffect(() => { if (aMeta) getColumns(aMeta).then(setFieldsA); }, [aMeta]);
  useEffect(() => { if (bMeta) getColumns(bMeta).then(setFieldsB); }, [bMeta]);

  /** Compute scalar values for ADM0 datasets **/
  async function scalar(meta: DatasetInfo) {
    if (meta.dataset_type === "population") {
      const { data: v } = await supabase.from("population_dataset_versions")
        .select("id").eq("country_iso", countryIso).eq("is_active", true).maybeSingle();
      if (!v) return null;
      const { data } = await supabase.from("population_data")
        .select("population").eq("dataset_version_id", v.id).limit(1);
      return data?.[0]?.population ?? null;
    }
    const { data } = await supabase.from("dataset_values").select("value").eq("dataset_id", meta.id).limit(1);
    return data?.[0]?.value ?? null;
  }

  useEffect(() => {
    if (!aMeta) return;
    const s = (aMeta.admin_level || "").toUpperCase() === "ADM0" && (aMeta.record_count ?? 0) <= 1;
    setAScalar(s); if (s) scalar(aMeta).then(setAVal);
  }, [aMeta?.id]);
  useEffect(() => {
    if (!bMeta) return;
    const s = (bMeta.admin_level || "").toUpperCase() === "ADM0" && (bMeta.record_count ?? 0) <= 1;
    setBScalar(s); if (s) scalar(bMeta).then(setBVal);
  }, [bMeta?.id]);

  /** Warn if admin levels mismatch **/
  useEffect(() => {
    if (!aMeta || !bMeta) return setWarn(null);
    const aL = aMeta.admin_level || "—", bL = bMeta.admin_level || "—";
    setWarn(aL === bL ? null : `⚠️ Joining ${aL} with ${bL} may require aggregation or flattening.`);
  }, [aMeta?.admin_level, bMeta?.admin_level]);

  /** Simple math logic **/
  const compute = (m: Method, a: number | null, b: number | null) =>
    m === "multiply" ? (a != null && b != null ? a * b : null)
      : m === "ratio" ? (a != null && b ? a / b : null)
      : m === "sum" ? (a ?? 0) + (b ?? 0)
      : m === "difference" ? (a ?? 0) - (b ?? 0) : null;

  /** Fetch data samples for preview **/
  async function sample(meta: DatasetInfo, j: string) {
    if (j === SCALAR) return [{ key: "<CONST>", value: await scalar(meta) }];
    if (meta.dataset_type === "population") {
      const { data: v } = await supabase.from("population_dataset_versions").select("id").eq("country_iso", countryIso).eq("is_active", true).maybeSingle();
      if (!v) return [];
      const { data } = await supabase.from("population_data")
        .select("pcode as key, population as value").eq("dataset_version_id", v.id).limit(500);
      return data || [];
    }
    const { data } = await supabase.from("dataset_values").select(`${j} as key,value`).eq("dataset_id", meta.id).limit(500);
    return data || [];
  }

  async function previewJoin() {
    setRows([]); if (!aMeta || !bMeta) return;
    const A = await sample(aMeta, aScalar ? SCALAR : joinA), B = await sample(bMeta, bScalar ? SCALAR : joinB);
    const mA = new Map(A.map((r: any) => [r.key, Number(r.value ?? null)])), mB = new Map(B.map((r: any) => [r.key, Number(r.value ?? null)]));
    const { data: admins } = await supabase.from("admin_units").select("pcode,name").eq("country_iso", countryIso).eq("level", target).limit(12);
    const out = (admins || []).map((a: any) => {
      const av = aScalar ? aVal : mA.get(a.pcode) ?? null, bv = bScalar ? bVal : mB.get(a.pcode) ?? null;
      const d = compute(method, av, bv);
      return { name: a.name, key: a.pcode, a: av, b: bv, derived: d != null ? Number(d.toFixed(round)) : null };
    });
    setRows(out);
  }

  async function handleCreate() {
    if (!aMeta || !bMeta) return; setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_simple_derived_dataset_v2", {
        p_country_iso: countryIso, p_dataset_a: aMeta.id, p_dataset_b: bMeta.id,
        p_title: title || `${aMeta.title} × ${bMeta.title}`, p_method: method,
        p_admin_level: target, p_unit: unit || null, p_round: round
      });
      if (error) throw error;
      onCreated?.(Array.isArray(data) ? data[0] : data); onClose();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
          <p className="text-xs text-gray-500">Step 1 Join Alignment → Step 2 Derivation</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700">Step 1 Join Alignment</h3>
          {warn && <div className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-700 p-2 rounded">{warn}</div>}

          <div className="grid md:grid-cols-2 gap-4">
            {[["A", aId, setAId, aMeta, joinA, setJoinA, fieldsA, aScalar],
              ["B", bId, setBId, bMeta, joinB, setJoinB, fieldsB, bScalar]].map(([l, id, sId, meta, join, sJoin, fields, scalar]: any) => (
              <div key={l}>
                <label className="block text-sm font-medium mb-1">Dataset {l}</label>
                <select value={id} onChange={(e) => sId(e.target.value)} className="w-full border rounded px-2 py-1.5">
                  <option value="">Select dataset…</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
                {meta && <div className="text-xs text-gray-600 mt-1">Type:{meta.dataset_type} · Level:{meta.admin_level ?? "—"} · Records:{meta.record_count ?? "?"}</div>}
                {!scalar && <div className="mt-2">
                  <label className="text-xs text-gray-700">Join Field</label>
                  <select value={join} onChange={(e) => sJoin(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
                    {(fields.length > 0 ? fields : ["pcode", "admin_pcode", "adm_code", "id"]).map((f: string) => <option key={f}>{f}</option>)}
                  </select>
                </div>}
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-700 pt-2">Step 2 Derivation / Calculation</h3>
          <div><label className="text-sm font-medium mb-1">Join Level</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="border rounded px-2 py-1.5">
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l) => <option key={l}>{l}</option>)}
            </select></div>

          <div><label className="text-sm font-medium mb-1">Method</label>
            <div className="flex flex-wrap gap-2">{(["multiply", "ratio", "sum", "difference", "aggregate", "custom"] as Method[]).map((m) =>
              <button key={m} onClick={() => setMethod(m)} className={`px-3 py-1.5 border rounded ${method === m ? "bg-blue-600 text-white border-blue-600" : ""}`}>{m}</button>)}</div></div>

          {aMeta && bMeta && <div className="text-xs text-gray-600 border p-2 rounded bg-gray-50">
            Result: <strong>A</strong> ({aMeta.title}) <em>{method}</em> <strong>B</strong> ({bMeta.title}) → target <strong>{target}</strong>
          </div>}

          <div className="grid md:grid-cols-3 gap-4">
            <input type="number" value={round} onChange={(e) => setRound(Number(e.target.value))} className="border rounded px-2 py-1.5" placeholder="Round" />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className="border rounded px-2 py-1.5" placeholder="Unit" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-2 py-1.5" placeholder="Title" />
          </div>

          <button onClick={previewJoin} className="text-blue-600 text-sm hover:underline">Preview join</button>
          <div className="border rounded overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {rows.length === 0 ? <div className="p-3 text-sm text-gray-500">No preview rows.</div> :
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0"><tr><th className="px-3 py-2 text-left">Admin Name</th><th className="px-3 py-2 text-left">PCode</th><th className="px-3 py-2 text-right">A</th><th className="px-3 py-2 text-right">B</th><th className="px-3 py-2 text-right">Derived</th></tr></thead>
                  <tbody>{rows.map((r, i) => <tr key={i} className="border-t"><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5">{r.key}</td><td className="px-3 py-1.5 text-right">{r.a ?? "—"}</td><td className="px-3 py-1.5 text-right">{r.b ?? "—"}</td><td className="px-3 py-1.5 text-right">{r.derived ?? "—"}</td></tr>)}</tbody>
                </table>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
          <button onClick={handleCreate} disabled={loading || !aMeta || !bMeta} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
