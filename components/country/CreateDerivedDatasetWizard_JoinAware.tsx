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
  record_count?: number | null;
  data_format?: string | null;
  year?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: (id?: string) => void;
};

type Method = "multiply" | "ratio" | "sum" | "difference" | "aggregate" | "custom";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [aId, setAId] = useState(""),
    [bId, setBId] = useState("");
  const [aMeta, setAMeta] = useState<DatasetInfo | null>(null),
    [bMeta, setBMeta] = useState<DatasetInfo | null>(null);
  const [joinA, setJoinA] = useState("pcode"),
    [joinB, setJoinB] = useState("pcode");
  const [fieldsA, setFieldsA] = useState<string[]>([]),
    [fieldsB, setFieldsB] = useState<string[]>([]);
  const [aLevel, setALevel] = useState("ADM3"),
    [bLevel, setBLevel] = useState("ADM3"),
    [target, setTarget] = useState("ADM3");
  const [method, setMethod] = useState<Method>("multiply");
  const [warn, setWarn] = useState<string | null>(null);
  const [round, setRound] = useState(0),
    [unit, setUnit] = useState(""),
    [title, setTitle] = useState("");
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(false);
  const [previewA, setPreviewA] = useState<any[]>([]),
    [previewB, setPreviewB] = useState<any[]>([]);

  /** Load datasets */
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
          const { data } = await supabase
            .from("dataset_metadata")
            .select("id,title,dataset_type,admin_level,record_count,year")
            .eq("country_iso", countryIso);
          setDatasets(
            (data || []).map((d: any) => ({
              id: d.id,
              title: d.title,
              dataset_type: d.dataset_type ?? "other",
              source_table: "dataset_values",
              join_field: "pcode",
              admin_level: d.admin_level,
              record_count: d.record_count,
              year: d.year,
            }))
          );
        }
      } catch {
        setDatasets([]);
      }
    })();
  }, [open, countryIso]);

  useEffect(() => setAMeta(datasets.find((d) => d.id === aId) || null), [aId, datasets]);
  useEffect(() => setBMeta(datasets.find((d) => d.id === bId) || null), [bId, datasets]);

  function getDefaultJoinFields(meta: DatasetInfo | null): string[] {
    if (!meta) return [];
    const t = meta.dataset_type;
    if (t === "population") return ["pcode"];
    if (t === "admin") return ["pcode"];
    if (t === "gis") return ["admin_pcode"];
    if (t === "gradient" || t === "categorical") return ["admin_pcode"];
    return ["id"];
  }

  useEffect(() => {
    if (aMeta) setFieldsA(getDefaultJoinFields(aMeta));
    if (bMeta) setFieldsB(getDefaultJoinFields(bMeta));
    if (aMeta?.admin_level) setALevel(aMeta.admin_level);
    if (bMeta?.admin_level) setBLevel(bMeta.admin_level);
  }, [aMeta, bMeta]);

  /** Warn on mismatch */
  useEffect(() => {
    const levels = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
    const idxA = levels.indexOf(aLevel);
    const idxB = levels.indexOf(bLevel);
    const deeper = idxA > idxB ? aLevel : bLevel;
    setTarget(deeper);
    setWarn(
      aLevel !== bLevel
        ? `⚠️ Joining ${aLevel} with ${bLevel} may require aggregation or flattening.`
        : null
    );
  }, [aLevel, bLevel]);

  /** Dataset preview (fetch 10 rows) */
  async function previewDataset(meta: DatasetInfo | null, side: "A" | "B") {
    if (!meta) return;
    try {
      const { data } = await supabase
        .from(meta.source_table || "dataset_values")
        .select("*")
        .limit(10);
      if (side === "A") setPreviewA(data || []);
      else setPreviewB(data || []);
    } catch (err) {
      console.error("Preview error:", err);
    }
  }

  async function previewJoin() {
    const { data: admins } = await supabase
      .from("admin_units")
      .select("pcode,name")
      .eq("country_iso", countryIso)
      .eq("level", target)
      .limit(10);
    setRows(
      admins?.map((a) => ({ name: a.name, key: a.pcode, a: "—", b: "—", derived: "—" })) || []
    );
  }

  async function handleCreate() {
    if (!aMeta || !bMeta) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_simple_derived_dataset_v2", {
        p_country_iso: countryIso,
        p_dataset_a: aMeta.id,
        p_dataset_b: bMeta.id,
        p_title: title || `${aMeta.title} × ${bMeta.title}`,
        p_method: method,
        p_admin_level: target,
        p_unit: unit || null,
        p_round: round,
      });
      if (error) throw error;
      onCreated?.(Array.isArray(data) ? data[0] : data);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
          <p className="text-xs text-gray-500">
            Step 1 Join Alignment → Step 2 Derivation
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700">
            Step 1 Join Alignment
          </h3>
          {warn && (
            <div className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-700 p-2 rounded">
              {warn}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {[["A", aId, setAId, aMeta, joinA, setJoinA, fieldsA, aLevel, setALevel, previewA, "A"],
              ["B", bId, setBId, bMeta, joinB, setJoinB, fieldsB, bLevel, setBLevel, previewB, "B"]].map(
              ([label, id, sId, meta, join, sJoin, fields, lvl, setLvl, preview, side]: any) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-1">
                    Dataset {label}
                  </label>
                  <select
                    value={id}
                    onChange={(e) => sId(e.target.value)}
                    className="w-full border rounded px-2 py-1.5"
                  >
                    <option value="">Select dataset…</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>

                  {meta && (
                    <div className="text-xs text-gray-600 mt-1">
                      Type:{meta.dataset_type} · Level:{meta.admin_level ?? "—"} · Records:
                      {meta.record_count ?? "?"}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-gray-700">Join Field</label>
                      <select
                        value={join}
                        onChange={(e) => sJoin(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      >
                        {fields.map((f: string) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">Admin Level</label>
                      <select
                        value={lvl}
                        onChange={(e) => setLvl(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      >
                        {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => previewDataset(meta, side)}
                    className="text-blue-600 text-xs mt-1 hover:underline"
                  >
                    Preview dataset
                  </button>

                  {preview && preview.length > 0 && (
                    <div className="mt-1 border rounded bg-gray-50 max-h-32 overflow-y-auto text-xs">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            {Object.keys(preview[0]).slice(0, 4).map((h) => (
                              <th key={h} className="px-2 py-1 text-left">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r: any, i: number) => (
                            <tr key={i} className="border-t">
                              {Object.values(r)
                                .slice(0, 4)
                                .map((v: any, j: number) => (
                                  <td key={j} className="px-2 py-1">
                                    {String(v)}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Step 2 */}
          <h3 className="text-sm font-semibold text-gray-700 pt-2">
            Step 2 Derivation / Calculation
          </h3>

          <div>
            <label className="text-sm font-medium mb-1">Join Level</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="border rounded px-2 py-1.5"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1">Method</label>
            <div className="flex flex-wrap gap-2">
              {(["multiply", "ratio", "sum", "difference", "aggregate", "custom"] as Method[]).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 border rounded ${
                      method === m ? "bg-blue-600 text-white border-blue-600" : ""
                    }`}
                  >
                    {m}
                  </button>
                )
              )}
            </div>
          </div>

          {aMeta && bMeta && (
            <div className="text-xs text-gray-600 border p-2 rounded bg-gray-50">
              Result: <strong>A</strong> ({aMeta.title}) <em>{method}</em>{" "}
              <strong>B</strong> ({bMeta.title}) → target{" "}
              <strong>{target}</strong>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(Number(e.target.value))}
              className="border rounded px-2 py-1.5"
              placeholder="Round"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="border rounded px-2 py-1.5"
              placeholder="Unit"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded px-2 py-1.5"
              placeholder="Title"
            />
          </div>

          <button onClick={previewJoin} className="text-blue-600 text-sm hover:underline">
            Preview join
          </button>

          <div className="border rounded overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No preview rows.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Admin Name</th>
                      <th className="px-3 py-2 text-left">PCode</th>
                      <th className="px-3 py-2 text-right">A</th>
                      <th className="px-3 py-2 text-right">B</th>
                      <th className="px-3 py-2 text-right">Derived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.key}</td>
                        <td className="px-3 py-1.5 text-right">{r.a}</td>
                        <td className="px-3 py-1.5 text-right">{r.b}</td>
                        <td className="px-3 py-1.5 text-right">{r.derived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !aMeta || !bMeta}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
