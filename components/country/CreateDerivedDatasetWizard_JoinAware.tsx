"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * CreateDerivedDatasetWizard_JoinAware
 * ------------------------------------
 * Supports creating derived datasets across population, admin, GIS, and metadata datasets.
 * - Detects dataset type and admin level
 * - Allows selecting join level
 * - Previews joins across different data sources
 */
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
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load datasets from multiple tables
  useEffect(() => {
    if (!open) return;
    (async () => {
      const results: any[] = [];

      const [meta, pop, gis, admin] = await Promise.all([
        supabase
          .from("dataset_metadata")
          .select("id,title,dataset_type,admin_level,year,data_format,record_count")
          .eq("country_iso", countryIso),
        supabase
          .from("population_dataset_versions")
          .select("id,title,admin_level,year")
          .eq("country_iso", countryIso),
        supabase
          .from("gis_dataset_versions")
          .select("id,title,admin_level")
          .eq("country_iso", countryIso),
        supabase
          .from("admin_dataset_versions")
          .select("id,title,is_active")
          .eq("country_iso", countryIso),
      ]);

      if (meta.data)
        results.push(
          ...meta.data.map((d) => ({
            id: d.id,
            title: d.title,
            dataset_type: d.dataset_type ?? "other",
            admin_level: d.admin_level ?? null,
            year: d.year ?? null,
            record_count: d.record_count ?? null,
          }))
        );

      if (pop.data)
        results.push(
          ...pop.data.map((d) => ({
            id: d.id,
            title: d.title ?? "Population",
            dataset_type: "population",
            admin_level: d.admin_level ?? "ADM3",
            year: d.year ?? null,
            record_count: null,
          }))
        );

      if (gis.data)
        results.push(
          ...gis.data.map((d) => ({
            id: d.id,
            title: d.title ?? "GIS Layer",
            dataset_type: "gis",
            admin_level: d.admin_level ?? null,
            year: null,
            record_count: null,
          }))
        );

      if (admin.data)
        results.push(
          ...admin.data.map((d) => ({
            id: d.id,
            title: d.title ?? "Admin Units",
            dataset_type: "admin",
            admin_level: null,
            year: null,
            record_count: null,
          }))
        );

      setDatasets(results);
    })();
  }, [open, countryIso]);

  // Derive metadata objects
  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === aId) || null);
    setBMeta(datasets.find((d) => d.id === bId) || null);
  }, [aId, bId, datasets]);

  // Preview logic (auto-detect dataset source)
  async function handlePreview() {
    if (!aId || !bId) return;
    setLoadingPreview(true);
    setError(null);
    setPreview([]);

    try {
      const getSource = (meta: any) =>
        meta?.dataset_type === "population" ? "population_data" : "dataset_values";

      const tableA = getSource(aMeta);
      const tableB = getSource(bMeta);

      const { data, error } = await supabase.rpc("preview_dataset_join", {
        p_dataset_a: aId,
        p_dataset_b: bId,
        p_method: method === "multiply" ? "product" : method,
        p_admin_level: targetLevel,
      });

      if (error) throw error;
      setPreview(data || []);
    } catch (err: any) {
      setError(err.message || "Preview failed.");
    } finally {
      setLoadingPreview(false);
    }
  }

  // Create derived dataset
  async function handleCreate() {
    if (!aId || !bId) return setError("Select both datasets.");
    if (!title.trim()) return setError("Enter a title.");
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
      if (!json.ok) throw new Error(json.error || "Failed to create derived dataset.");
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

        {/* Dataset selectors */}
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
                      {d.title} — {d.dataset_type}
                      {d.admin_level ? ` (${d.admin_level})` : ""}
                    </option>
                  ))}
                </select>
                {meta && (
                  <div className="mt-1 text-xs text-gray-500">
                    Type: {meta.dataset_type}, Level: {meta.admin_level ?? "N/A"},{" "}
                    Records: {meta.record_count ?? "?"}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Target admin level */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">Join / Target Admin Level</label>
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
            {["multiply", "ratio", "sum", "difference", "aggregate"].map((m) => (
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

        {/* Metadata fields */}
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

        {/* Preview */}
        <div className="mt-4">
          <button
            onClick={handlePreview}
            className="text-sm text-blue-600 underline"
            disabled={!aId || !bId || loadingPreview}
          >
            {loadingPreview ? "Loading preview..." : "Preview join"}
          </button>

          {preview.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border rounded p-2 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-600 text-left">
                    <th className="p-1">admin_pcode</th>
                    <th className="p-1">A value</th>
                    <th className="p-1">B value</th>
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

        {/* Actions */}
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
