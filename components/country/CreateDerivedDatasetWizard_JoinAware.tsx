"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated: (id: string) => void;
}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [aMeta, setAMeta] = useState<any>(null);
  const [bMeta, setBMeta] = useState<any>(null);
  const [method, setMethod] = useState<string>("ratio");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all datasets (population, admin, derived, gis)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,dataset_type,admin_level,year,data_format,record_count")
        .eq("country_iso", countryIso)
        .order("dataset_type");
      if (!error && data) setDatasets(data);
    })();
  }, [open, countryIso]);

  // Load metadata on selection
  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === aId) || null);
    setBMeta(datasets.find((d) => d.id === bId) || null);
  }, [aId, bId, datasets]);

  // Infer suggested method
  useEffect(() => {
    if (!aMeta || !bMeta) return;
    if (aMeta.dataset_type === "population" && bMeta.dataset_type === "admin") {
      setMethod("aggregate");
    } else if (aMeta.dataset_type === "population" && bMeta.admin_level === "ADM0") {
      setMethod("ratio"); // apply constant
    } else {
      setMethod("ratio");
    }
  }, [aMeta, bMeta]);

  // Preview join
  async function handlePreview() {
    if (!aId || !bId) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("preview_dataset_join", {
        p_dataset_a: aId,
        p_dataset_b: bId,
        p_method: method,
        p_admin_level: targetLevel,
      });
      if (error) throw error;
      setPreview(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  // Create derived dataset
  async function handleCreate() {
    if (!aId || !bId) {
      setError("Select both datasets.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        country_iso: countryIso,
        datasets: [{ id: aId }, { id: bId }],
        method,
        admin_level: targetLevel,
        title: title.trim(),
        unit: unit || null,
      };

      const res = await fetch(
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

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create derived dataset");
      onCreated(json.derived_dataset_id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Derived Dataset</h2>

        {/* dataset selectors */}
        <div className="grid grid-cols-2 gap-4">
          {[["A", aId, setAId, aMeta], ["B", bId, setBId, bMeta]].map(
            ([label, value, setter, meta]) => (
              <div key={label as string}>
                <label className="text-sm text-gray-600">Dataset {label}</label>
                <select
                  value={value as string}
                  onChange={(e) => setter(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">Select...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} — {d.dataset_type} ({d.admin_level})
                    </option>
                  ))}
                </select>
                {meta && (
                  <div className="mt-1 text-xs text-gray-500">
                    Type: {meta.dataset_type}, Level: {meta.admin_level}, Records:{" "}
                    {meta.record_count ?? "?"}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* level + method */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Target Admin Level</label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Method</label>
            <div className="mt-1 flex gap-2">
              {["ratio", "sum", "difference", "aggregate"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1 rounded border ${
                    method === m ? "bg-gray-900 text-white" : ""
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* title/unit */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Title</label>
            <input
              className="mt-1 w-full rounded border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
        </div>

        {/* preview section */}
        <div className="mt-4">
          <button
            onClick={handlePreview}
            className="text-sm text-blue-600 underline"
            disabled={!aId || !bId || loadingPreview}
          >
            {loadingPreview ? "Loading preview..." : "Preview join"}
          </button>

          {preview.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-xs">
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
                  {preview.map((r: any) => (
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

        {/* actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
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
