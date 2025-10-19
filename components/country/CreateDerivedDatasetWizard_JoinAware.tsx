"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetInfo = {
  id: string;
  title: string;
  dataset_type: string;
  join_field: string;
  source_table: string;
  admin_level: string | null;
  data_format?: string | null;
  record_count?: number | null;
  is_active?: boolean;
  year?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: (newId?: string) => void;
};

type Method = "multiply" | "ratio" | "sum" | "difference" | "aggregate" | "custom";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        active ? "bg-blue-600" : "bg-gray-300"
      }`}
    />
  );
}

const JOINS_DEFAULT = ["admin_pcode", "pcode", "adm_code", "id", "category_label"];

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const [aMeta, setAMeta] = useState<DatasetInfo | null>(null);
  const [bMeta, setBMeta] = useState<DatasetInfo | null>(null);

  const [joinA, setJoinA] = useState("admin_pcode");
  const [joinB, setJoinB] = useState("admin_pcode");

  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState<Method>("multiply");
  const [roundTo, setRoundTo] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");

  const [previewRows, setPreviewRows] = useState<
    { key: string; a?: number | null; b?: number | null; derived?: number | null }[]
  >([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Load datasets list from edge function (with CORS) or fall back to views
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const url = `${base}/functions/v1/get-country-datasets?iso=${countryIso}`;
        const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (res.ok) {
          const json = await res.json();
          setDatasets(json.datasets || []);
        } else {
          // fallback – minimal coverage via dataset_metadata
          const { data } = await supabase
            .from("dataset_metadata")
            .select(
              "id,title,dataset_type,admin_level,record_count,year"
            )
            .eq("country_iso", countryIso);
          setDatasets(
            (data || []).map((d: any) => ({
              id: d.id,
              title: d.title,
              dataset_type: d.dataset_type ?? "other",
              join_field: "admin_pcode",
              source_table: "dataset_values",
              admin_level: d.admin_level,
              data_format: "numeric",
              record_count: d.record_count,
              year: d.year,
            }))
          );
        }
      } catch (e) {
        console.warn("Failed to load datasets:", (e as Error).message);
        setDatasets([]);
      }
    })();
  }, [open, countryIso]);

  // keep local meta
  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === aId) || null);
  }, [aId, datasets]);
  useEffect(() => {
    setBMeta(datasets.find((d) => d.id === bId) || null);
  }, [bId, datasets]);

  // ---------------------------------------------------------------------------
  // Helpers
  const methodLabel = useMemo(() => {
    switch (method) {
      case "multiply":
        return "A × B";
      case "ratio":
        return "A ÷ B";
      case "sum":
        return "A + B";
      case "difference":
        return "A − B";
      case "aggregate":
        return "aggregate(A,B)";
      case "custom":
        return "custom formula";
      default:
        return "";
    }
  }, [method]);

  const joinWarning = useMemo(() => {
    if (!aMeta || !bMeta) return null;
    const aLvl = aMeta.admin_level || "—";
    const bLvl = bMeta.admin_level || "—";
    if (aLvl !== bLvl || aLvl !== targetLevel) {
      return `Selected datasets are at A:${aLvl} and B:${bLvl}; target is ${targetLevel}. The preview uses row-level joins; the final compute may aggregate/expand to the target level as needed.`;
    }
    return null;
  }, [aMeta, bMeta, targetLevel]);

  // ---------------------------------------------------------------------------
  // Preview: fetch top rows for A and B from dataset_values (or population_data / gis_layers)
  async function previewJoin() {
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      if (!aMeta || !bMeta) {
        setPreviewRows([]);
        setPreviewLoading(false);
        return;
      }

      // Load up to 200 rows from source tables
      const rowsA = await fetchRowsFor(aMeta, joinA, 200);
      const rowsB = await fetchRowsFor(bMeta, joinB, 200);

      // Normalize into a keyed map and compute
      const mapA = new Map<string, number | null>();
      for (const r of rowsA) {
        const k = String(r.key ?? "");
        const v = r.value != null ? Number(r.value) : null;
        if (!mapA.has(k)) mapA.set(k, v);
      }
      const mapB = new Map<string, number | null>();
      for (const r of rowsB) {
        const k = String(r.key ?? "");
        const v = r.value != null ? Number(r.value) : null;
        if (!mapB.has(k)) mapB.set(k, v);
      }

      // union of keys
      const keys = new Set<string>();
      for (const k of mapA.keys()) keys.add(k);
      for (const k of mapB.keys()) keys.add(k);

      const out: { key: string; a?: number | null; b?: number | null; derived?: number | null }[] =
        [];
      for (const key of keys) {
        const aVal = mapA.get(key) ?? null;
        const bVal = mapB.get(key) ?? null;
        const derived = compute(method, aVal, bVal);
        const rounded =
          derived != null && isFinite(derived)
            ? Number(derived.toFixed(Number(roundTo ?? 0)))
            : null;
        out.push({ key, a: aVal, b: bVal, derived: rounded });
      }

      // sort for stable viewing and limit to 20
      out.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
      setPreviewRows(out.slice(0, 20));
    } catch (err: any) {
      setPreviewError(err.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function fetchRowsFor(meta: DatasetInfo, joinField: string, limit = 200) {
    // dataset_values (generic)
    if (meta.source_table === "dataset_values" || meta.dataset_type === "derived" || meta.dataset_type === "other") {
      const { data } = await supabase
        .from("dataset_values")
        .select(`${joinField} as key, value`)
        .eq("dataset_id", meta.id)
        .not(joinField, "is", null)
        .limit(limit);
      return (data || []).map((d: any) => ({ key: d.key, value: d.value }));
    }

    // population_data
    if (meta.source_table === "population_data" || meta.dataset_type === "population") {
      const jf = joinField === "admin_pcode" ? "pcode" : joinField;
      const { data } = await supabase
        .from("population_data")
        .select(`${jf} as key, population as value`)
        .limit(limit);
      return (data || []).map((d: any) => ({ key: d.key, value: d.value }));
    }

    // gis_layers – use area or feature_count if available (preview only)
    if (meta.source_table === "gis_layers" || meta.dataset_type === "gis") {
      const jf = joinField === "admin_pcode" ? "admin_pcode" : joinField;
      const { data } = await supabase
        .from("gis_layers")
        .select(`${jf} as key, area_sqkm as value`)
        .limit(limit);
      return (data || []).map((d: any) => ({ key: d.key, value: d.value ?? null }));
    }

    // admin_units – no numeric value; preview uses null
    if (meta.source_table === "admin_units" || meta.dataset_type === "admin") {
      const jf = joinField === "admin_pcode" ? "pcode" : joinField;
      const { data } = await supabase
        .from("admin_units")
        .select(`${jf} as key`)
        .limit(limit);
      return (data || []).map((d: any) => ({ key: d.key, value: null }));
    }

    // fallback
    const { data } = await supabase
      .from("dataset_values")
      .select(`${joinField} as key, value`)
      .eq("dataset_id", meta.id)
      .limit(limit);
    return (data || []).map((d: any) => ({ key: d.key, value: d.value }));
  }

  function compute(m: Method, a: number | null, b: number | null): number | null {
    const A = a ?? null;
    const B = b ?? null;
    switch (m) {
      case "multiply":
        return A != null && B != null ? A * B : null;
      case "ratio":
        return A != null && B != null && B !== 0 ? A / B : null;
      case "sum":
        return (A ?? 0) + (B ?? 0);
      case "difference":
        return (A ?? 0) - (B ?? 0);
      case "aggregate":
        // preview doesn’t aggregate; compute happens server-side
        return A ?? null;
      case "custom":
        return null;
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  async function handleCreate() {
    if (!aMeta || !bMeta) return;
    setLoading(true);
    try {
      // Prefer edge function if present
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const url = `${base}/functions/v1/compute-derived`;
      const body = {
        country_iso: countryIso,
        method,
        title: title || deriveTitle(aMeta, bMeta, method),
        unit: unit || null,
        round: Number(roundTo ?? 0),
        target_admin_level: targetLevel,
        datasets: [
          { id: aMeta.id, join_field: joinA },
          { id: bMeta.id, join_field: joinB },
        ],
      };

      let ok = false;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        ok = res.ok;
        if (!ok) console.warn("compute-derived responded:", res.status);
      } catch (e) {
        // ignore network errors; try RPC next
      }

      if (!ok) {
        // Fallback RPC – simple pairs
        const { data, error } = await supabase.rpc("create_simple_derived_dataset_v2", {
          p_country_iso: countryIso,
          p_dataset_a: aMeta.id,
          p_dataset_b: bMeta.id,
          p_title: title || deriveTitle(aMeta, bMeta, method),
          p_method: method,
          p_admin_level: targetLevel,
          p_unit: unit || null,
          p_round: Number(roundTo ?? 0),
        });
        if (error) throw error;
        if (onCreated) onCreated(Array.isArray(data) ? data[0] : data);
      } else {
        if (onCreated) onCreated();
      }
      onClose();
    } catch (err: any) {
      alert(`Create failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  function deriveTitle(a: DatasetInfo, b: DatasetInfo, m: Method) {
    const base =
      m === "multiply"
        ? "×"
        : m === "ratio"
        ? "÷"
        : m === "sum"
        ? "+"
        : m === "difference"
        ? "−"
        : "Derived";
    return `${a.title} ${base} ${b.title}`;
  }

  // ---------------------------------------------------------------------------
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg">
        <div className="p-5 border-b">
          <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Banner */}
          {datasets.length === 0 && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
              ⚠ No datasets found for this country.
            </div>
          )}

          {/* Dataset selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* A */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dataset A</label>
              <select
                value={aId}
                onChange={(e) => setAId(e.target.value)}
                className="w-full rounded border px-2 py-1.5"
              >
                <option value="">Select...</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>

              <div className="mt-2 rounded border p-2 text-sm text-gray-700 min-h-[72px]">
                {aMeta ? (
                  <div>
                    <div className="font-medium">{aMeta.title}</div>
                    <div className="text-gray-600">
                      Format: {aMeta.data_format ?? "numeric"}
                      {" · "}Source: {aMeta.source_table}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span>Join:</span>
                      <select
                        className="rounded border px-1.5 py-1 text-sm"
                        value={joinA}
                        onChange={(e) => setJoinA(e.target.value)}
                      >
                        {[aMeta.join_field, ...JOINS_DEFAULT]
                          .filter(Boolean)
                          .filter((v, i, arr) => arr.indexOf(v!) === i)
                          .map((f) => (
                            <option key={f} value={f!}>
                              {f}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No dataset</div>
                )}
              </div>
            </div>

            {/* B */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dataset B</label>
              <select
                value={bId}
                onChange={(e) => setBId(e.target.value)}
                className="w-full rounded border px-2 py-1.5"
              >
                <option value="">Select...</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>

              <div className="mt-2 rounded border p-2 text-sm text-gray-700 min-h-[72px]">
                {bMeta ? (
                  <div>
                    <div className="font-medium">{bMeta.title}</div>
                    <div className="text-gray-600">
                      Format: {bMeta.data_format ?? "numeric"}
                      {" · "}Source: {bMeta.source_table}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span>Join:</span>
                      <select
                        className="rounded border px-1.5 py-1 text-sm"
                        value={joinB}
                        onChange={(e) => setJoinB(e.target.value)}
                      >
                        {[bMeta.join_field, ...JOINS_DEFAULT]
                          .filter(Boolean)
                          .filter((v, i, arr) => arr.indexOf(v!) === i)
                          .map((f) => (
                            <option key={f} value={f!}>
                              {f}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No dataset</div>
                )}
              </div>
            </div>
          </div>

          {/* Join level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join Level</label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="w-full rounded border px-2 py-1.5 max-w-sm"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            {joinWarning && (
              <div className="mt-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                {joinWarning}
              </div>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <div className="flex flex-wrap gap-2">
              {(["multiply", "ratio", "sum", "difference", "aggregate", "custom"] as Method[]).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    type="button"
                    className={`px-3 py-1.5 rounded border ${
                      method === m ? "bg-blue-600 text-white border-blue-600" : "bg-white"
                    }`}
                  >
                    {m}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Live join explainer */}
          <div className="rounded border p-3 bg-gray-50 text-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Radio active={!!aMeta} />
                <span className="font-medium">A</span>
                <Pill>{aMeta?.title ?? "—"}</Pill>
                <Pill>join: {joinA}</Pill>
                {aMeta?.admin_level && <Pill>level: {aMeta.admin_level}</Pill>}
              </div>
              <span className="text-gray-500">⟷</span>
              <div className="flex items-center gap-2">
                <Radio active={!!bMeta} />
                <span className="font-medium">B</span>
                <Pill>{bMeta?.title ?? "—"}</Pill>
                <Pill>join: {joinB}</Pill>
                {bMeta?.admin_level && <Pill>level: {bMeta.admin_level}</Pill>}
              </div>
              <span className="text-gray-500">→</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">Result:</span>
                <Pill>{methodLabel}</Pill>
                <Pill>round: {roundTo}</Pill>
                <Pill>target: {targetLevel}</Pill>
              </div>
            </div>
          </div>

          {/* Round / Unit / Title */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
              <input
                type="number"
                value={roundTo}
                onChange={(e) => setRoundTo(Number(e.target.value))}
                className="w-full rounded border px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded border px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border px-2 py-1.5"
                placeholder="e.g., Estimated Poor Households"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={previewJoin}
              className="text-blue-600 hover:underline text-sm"
            >
              Preview join
            </button>
            <div className="text-sm text-gray-600">
              {aMeta && bMeta ? (
                <span>
                  Formula: <span className="font-mono">{methodLabel}</span>
                </span>
              ) : (
                <span>Select Dataset A & B to preview</span>
              )}
            </div>
          </div>

          <div className="border rounded">
            {previewLoading ? (
              <div className="p-3 text-sm text-gray-500">Loading preview…</div>
            ) : previewError ? (
              <div className="p-3 text-sm text-red-600">Load failed: {previewError}</div>
            ) : previewRows.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No preview rows.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Join key</th>
                      <th className="px-3 py-2 text-right">A value</th>
                      <th className="px-3 py-2 text-right">B value</th>
                      <th className="px-3 py-2 text-right">Derived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => (
                      <tr key={r.key} className="border-t">
                        <td className="px-3 py-1.5">{r.key}</td>
                        <td className="px-3 py-1.5 text-right">
                          {r.a == null ? "—" : Intl.NumberFormat().format(r.a)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.b == null ? "—" : Intl.NumberFormat().format(r.b)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.derived == null ? "—" : Intl.NumberFormat().format(r.derived)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={handleCreate}
            disabled={loading || !aMeta || !bMeta}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
