"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { fetchCountryDatasets } from "@/lib/datasets";

type WizardProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated: (id: string) => void;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: WizardProps) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [aMeta, setAMeta] = useState<any>(null);
  const [bMeta, setBMeta] = useState<any>(null);
  const [joinA, setJoinA] = useState("admin_pcode");
  const [joinB, setJoinB] = useState("admin_pcode");
  const [joinFieldsA, setJoinFieldsA] = useState<string[]>([]);
  const [joinFieldsB, setJoinFieldsB] = useState<string[]>([]);
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [formula, setFormula] = useState("");
  const [round, setRound] = useState(0);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load datasets from unified Edge Function (no RLS issues)
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setWarning(null);
        const { datasets } = await fetchCountryDatasets(countryIso);
        if (!datasets || datasets.length === 0)
          setWarning("⚠️ No datasets found for this country.");
        setDatasets(datasets);
      } catch (err: any) {
        console.error("Dataset load failed:", err);
        setWarning(
          "⚠️ Some dataset types could not be loaded (RLS or missing data)."
        );
      }
    })();
  }, [open, countryIso]);

  // ---------------------------------------------------------------------------
  // Match selected dataset metadata
  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === aId) || null);
    setBMeta(datasets.find((d) => d.id === bId) || null);
  }, [aId, bId, datasets]);

  // ---------------------------------------------------------------------------
  // Fetch joinable fields (keys)
  async function getJoinFields(meta: any, setter: any) {
    if (!meta) return;
    try {
      const { data } = await supabase
        .from(meta.source_table)
        .select("*")
        .limit(1);
      if (data && data.length > 0) {
        setter(Object.keys(data[0]).filter((c) => c !== "value"));
      } else setter([meta.join_field || "admin_pcode"]);
    } catch {
      setter([meta.join_field || "admin_pcode"]);
    }
  }
  useEffect(() => {
    if (aMeta) getJoinFields(aMeta, setJoinFieldsA);
    if (bMeta) getJoinFields(bMeta, setJoinFieldsB);
  }, [aMeta, bMeta]);

  // ---------------------------------------------------------------------------
  // Adjust method based on dataset type
  useEffect(() => {
    if (aMeta && bMeta) {
      const rate =
        aMeta.data_format === "percentage" ||
        bMeta.data_format === "percentage";
      setMethod(rate ? "multiply" : "ratio");
    }
  }, [aMeta, bMeta]);

  // ---------------------------------------------------------------------------
  // Formula presets
  const presets = [
    { l: "Multiply (A×B)", f: "a.value*b.value" },
    { l: "Multiply % (A×B/100)", f: "(a.value*b.value/100)" },
    { l: "Divide (A÷B)", f: "a.value/nullif(b.value,0)" },
    { l: "Sum (A+B)", f: "a.value+b.value" },
    { l: "Diff (A–B)", f: "a.value-b.value" },
  ];

  // ---------------------------------------------------------------------------
  // Preview join results
  async function previewJoin() {
    if (!aId || !bId) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("preview_dataset_join", {
        p_dataset_a: aId,
        p_dataset_b: bId,
        p_method: method,
        p_admin_level: targetLevel,
        p_join_a: joinA,
        p_join_b: joinB,
        p_formula: formula || null,
        p_round: round,
      });
      if (error) throw error;
      setPreview(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Create the derived dataset (store metadata + computed values)
  async function createDerived() {
    if (!aId || !bId) return setError("Select both datasets.");
    if (!title.trim()) return setError("Enter title.");
    setSaving(true);
    try {
      const payload = {
        country_iso: countryIso,
        datasets: [
          { id: aId, join_field: joinA },
          { id: bId, join_field: joinB },
        ],
        method,
        admin_level: targetLevel,
        title: title.trim(),
        unit: unit || null,
      };
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/compute-derived`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      onCreated(j.derived_dataset_id);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // Small dataset info card
  const Card = ({
    m,
    j,
    s,
    f,
  }: {
    m: any;
    j: string;
    s: any;
    f: string[];
  }) => (
    <div className="text-xs mt-1 border rounded p-2 bg-gray-50">
      {m ? (
        <>
          <div>
            <b>{m.title}</b> — {m.dataset_type}{" "}
            {m.admin_level ? `(${m.admin_level})` : ""}
          </div>
          <div>Format: {m.data_format}</div>
          <div>Source: {m.source_table}</div>
          <div>
            Join:{" "}
            <select
              value={j}
              onChange={(e) => s(e.target.value)}
              className="ml-2 border rounded px-1"
            >
              {f.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <i className="text-gray-500">No dataset</i>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Derived Dataset</h2>

        {warning && (
          <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm border border-yellow-200">
            {warning}
          </div>
        )}

        {/* Dataset A / B */}
        <div className="grid grid-cols-2 gap-4">
          {[["A", aId, setAId, aMeta, joinA, setJoinA, joinFieldsA],
          ["B", bId, setBId, bMeta, joinB, setJoinB, joinFieldsB]].map(
            ([L, v, s, m, j, js, f]) => (
              <div key={L as string}>
                <label className="text-sm text-gray-600">Dataset {L}</label>
                <select
                  value={v as string}
                  onChange={(e) => s(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">Select...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} — {d.dataset_type}
                      {d.admin_level ? ` (${d.admin_level})` : ""}
                    </option>
                  ))}
                </select>
                <Card
                  m={m}
                  j={j as string}
                  s={js}
                  f={f as string[]}
                />
              </div>
            )
          )}
        </div>

        {/* Join level */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">Join Level</label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Method */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">Method</label>
          <div className="mt-1 flex gap-2 flex-wrap">
            {["multiply", "ratio", "sum", "difference", "aggregate", "custom"].map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1 rounded border ${method === m ? "bg-gray-900 text-white" : ""
                    }`}
                >
                  {m}
                </button>
              )
            )}
          </div>
        </div>

        {/* Custom formula */}
        {method === "custom" && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-gray-600">Custom Formula</label>
              <select
                onChange={(e) => setFormula(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="">Preset...</option>
                {presets.map((p) => (
                  <option key={p.l} value={p.f}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="mt-1 w-full rounded border p-2 text-xs"
              placeholder="(a.value*b.value/100)"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use <code>a.value</code> and <code>b.value</code> in expressions
            </p>
          </div>
        )}

        {/* Metadata inputs */}
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Round</label>
            <input
              type="number"
              className="mt-1 w-full rounded border p-2"
              value={round}
              min={0}
              max={6}
              onChange={(e) => setRound(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Unit</label>
            <input
              className="mt-1 w-full rounded border p-2"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Title</label>
            <input
              className="mt-1 w-full rounded border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Preview + Results */}
        <div className="mt-4">
          <button
            onClick={previewJoin}
            className="text-sm text-blue-600 underline"
            disabled={!aId || !bId || loadingPreview}
          >
            {loadingPreview ? "Loading..." : "Preview join"}
          </button>

          {preview.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border rounded p-2 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-600 text-left">
                    <th className="p-1">admin_pcode</th>
                    <th className="p-1">A</th>
                    <th className="p-1">B</th>
                    <th className="p-1">Derived</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.admin_pcode}>
                      <td className="p-1">{r.admin_pcode}</td>
                      <td className="p-1">{r.value_a ?? ""}</td>
                      <td className="p-1">{r.value_b ?? ""}</td>
                      <td className="p-1">{r.derived_value ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={createDerived}
            disabled={saving}
            className="px-4 py-1.5 rounded bg-blue-600 text-white"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
