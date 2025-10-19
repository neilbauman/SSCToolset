"use client";
import { useEffect, useState } from "react";
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
  year?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: (id?: string) => void;
};

type Method =
  | "multiply"
  | "ratio"
  | "sum"
  | "difference"
  | "aggregate"
  | "custom";

const SCALAR_JOIN_SENTINEL = "<SCALAR>";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [aMeta, setAMeta] = useState<DatasetInfo | null>(null);
  const [bMeta, setBMeta] = useState<DatasetInfo | null>(null);
  const [aScalar, setAScalar] = useState(false);
  const [bScalar, setBScalar] = useState(false);
  const [aScalarValue, setAScalarValue] = useState<number | null>(null);
  const [bScalarValue, setBScalarValue] = useState<number | null>(null);
  const [joinA, setJoinA] = useState("admin_pcode");
  const [joinB, setJoinB] = useState("admin_pcode");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState<Method>("multiply");
  const [roundTo, setRoundTo] = useState(0);
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-country-datasets?iso=${countryIso}`;
        const res = await fetch(edgeUrl, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          setDatasets(json.datasets || []);
        } else {
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

  useEffect(
    () => setAMeta(datasets.find((d) => d.id === aId) || null),
    [aId, datasets]
  );
  useEffect(
    () => setBMeta(datasets.find((d) => d.id === bId) || null),
    [bId, datasets]
  );

  async function scalar(meta: DatasetInfo) {
    if (meta.dataset_type === "population") {
      const { data: version } = await supabase
        .from("population_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!version) return null;
      const { data } = await supabase
        .from("population_data")
        .select("population")
        .eq("dataset_version_id", version.id)
        .limit(1);
      return data?.[0]?.population ?? null;
    }
    const { data } = await supabase
      .from("dataset_values")
      .select("value")
      .eq("dataset_id", meta.id)
      .limit(1);
    return data?.[0]?.value ?? null;
  }

  useEffect(() => {
    if (!aMeta) return;
    const s =
      (aMeta.admin_level || "").toUpperCase() === "ADM0" &&
      (aMeta.record_count ?? 0) <= 1;
    setAScalar(s);
    if (s) scalar(aMeta).then(setAScalarValue);
  }, [aMeta?.id]);

  useEffect(() => {
    if (!bMeta) return;
    const s =
      (bMeta.admin_level || "").toUpperCase() === "ADM0" &&
      (bMeta.record_count ?? 0) <= 1;
    setBScalar(s);
    if (s) scalar(bMeta).then(setBScalarValue);
  }, [bMeta?.id]);

  function compute(m: Method, a: number | null, b: number | null) {
    switch (m) {
      case "multiply":
        return a != null && b != null ? a * b : null;
      case "ratio":
        return a != null && b ? a / b : null;
      case "sum":
        return (a ?? 0) + (b ?? 0);
      case "difference":
        return (a ?? 0) - (b ?? 0);
      default:
        return null;
    }
  }

  async function rows(meta: DatasetInfo, j: string) {
    if (j === SCALAR_JOIN_SENTINEL)
      return [{ key: "<CONST>", value: await scalar(meta) }];

    if (meta.dataset_type === "population") {
      const { data: version } = await supabase
        .from("population_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!version) return [];
      const { data } = await supabase
        .from("population_data")
        .select("admin_pcode as key, population as value")
        .eq("dataset_version_id", version.id)
        .limit(500);
      return data || [];
    }

    const { data } = await supabase
      .from("dataset_values")
      .select(`${j} as key, value`)
      .eq("dataset_id", meta.id)
      .limit(500);
    return data || [];
  }

  async function previewJoin() {
    setPreviewRows([]);
    if (!aMeta || !bMeta) return;

    const A = await rows(aMeta, aScalar ? SCALAR_JOIN_SENTINEL : joinA);
    const B = await rows(bMeta, bScalar ? SCALAR_JOIN_SENTINEL : joinB);
    const mA = new Map(A.map((r: any) => [r.key, Number(r.value ?? null)]));
    const mB = new Map(B.map((r: any) => [r.key, Number(r.value ?? null)]));

    const { data: admins } = await supabase
      .from("admin_units")
      .select("pcode,name")
      .eq("country_iso", countryIso)
      .eq("level", targetLevel)
      .limit(12);

    const out = (admins || []).map((adm: any) => {
      const a = aScalar ? aScalarValue : mA.get(adm.pcode) ?? null;
      const b = bScalar ? bScalarValue : mB.get(adm.pcode) ?? null;
      const d = compute(method, a, b);
      return {
        name: adm.name,
        key: adm.pcode,
        a,
        b,
        derived: d != null ? Number(d.toFixed(roundTo)) : null,
      };
    });
    setPreviewRows(out);
  }

  async function handleCreate() {
    if (!aMeta || !bMeta) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "create_simple_derived_dataset_v2",
        {
          p_country_iso: countryIso,
          p_dataset_a: aMeta.id,
          p_dataset_b: bMeta.id,
          p_title:
            title || `${aMeta.title} × ${bMeta.title}`,
          p_method: method,
          p_admin_level: targetLevel,
          p_unit: unit || null,
          p_round: roundTo,
        }
      );
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
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["A", aId, setAId, aMeta],
              ["B", bId, setBId, bMeta],
            ].map(([lbl, id, setId, meta]: any) => (
              <div key={lbl}>
                <label className="block text-sm font-medium mb-1">
                  Dataset {lbl}
                </label>
                <select
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                >
                  <option value="">Select...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
                {meta && (
                  <div className="text-xs text-gray-600 mt-1">
                    Type: {meta.dataset_type} · Level:{" "}
                    {meta.admin_level ?? "—"} · Records:{" "}
                    {meta.record_count ?? "?"}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-1">Join Level</label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
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
              {(
                ["multiply", "ratio", "sum", "difference", "aggregate", "custom"] as Method[]
              ).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 border rounded ${
                    method === m
                      ? "bg-blue-600 text-white border-blue-600"
                      : ""
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {aMeta && bMeta && (
            <div className="text-xs text-gray-600 border p-2 rounded bg-gray-50">
              Result: <strong>A</strong> ({aMeta.title}){" "}
              <em>{method}</em> <strong>B</strong> ({bMeta.title}) → target{" "}
              <strong>{targetLevel}</strong>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              value={roundTo}
              onChange={(e) => setRoundTo(Number(e.target.value))}
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

          <button
            onClick={previewJoin}
            className="text-blue-600 text-sm hover:underline"
          >
            Preview join
          </button>

          <div className="border rounded overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {previewRows.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  No preview rows.
                </div>
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
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.key}</td>
                        <td className="px-3 py-1.5 text-right">
                          {r.a ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.b ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.derived ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded"
          >
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
