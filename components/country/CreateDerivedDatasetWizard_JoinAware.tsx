"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * CreateDerivedDatasetWizard_JoinAware
 * ------------------------------------
 * Analyst-focused wizard for constructing derived datasets
 * across population, GIS, admin, and indicator datasets.
 * 
 * Features:
 * - Dynamic join-field discovery
 * - Shows dataset attributes and source table
 * - Formula helper presets
 * - Handles percentages automatically
 * - Custom formula and rounding control
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
  const [joinA, setJoinA] = useState("admin_pcode");
  const [joinB, setJoinB] = useState("admin_pcode");
  const [joinFieldsA, setJoinFieldsA] = useState<string[]>([]);
  const [joinFieldsB, setJoinFieldsB] = useState<string[]>([]);
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [formula, setFormula] = useState("");
  const [round, setRound] = useState(2);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all dataset types
  useEffect(() => {
    if (!open) return;
    (async () => {
      const results: any[] = [];

      const [meta, pop, gis, admin] = await Promise.all([
        supabase
          .from("dataset_metadata")
          .select(
            "id,title,dataset_type,admin_level,year,data_format,record_count,join_field"
          )
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
            data_format: d.data_format ?? "numeric",
            record_count: d.record_count ?? null,
            join_field: d.join_field ?? "admin_pcode",
            source_table: "dataset_values",
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
            data_format: "numeric",
            record_count: null,
            join_field: "pcode",
            source_table: "population_data",
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
            data_format: "numeric",
            record_count: null,
            join_field: "admin_pcode",
            source_table: "gis_layers",
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
            data_format: "categorical",
            record_count: null,
            join_field: "pcode",
            source_table: "admin_units",
          }))
        );

      setDatasets(results);
    })();
  }, [open, countryIso]);

  // Detect metadata for selected datasets
  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === aId) || null);
    setBMeta(datasets.find((d) => d.id === bId) || null);
  }, [aId, bId, datasets]);

  // Fetch available join fields dynamically
  async function fetchJoinFields(meta: any, setFields: any) {
    if (!meta) return;
    try {
      const table = meta.source_table;
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .limit(1);
      if (error) throw error;
      const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
      setFields(cols.filter((c) => c !== "value"));
    } catch (err) {
      setFields([meta.join_field || "admin_pcode"]);
    }
  }

  useEffect(() => {
    if (aMeta) fetchJoinFields(aMeta, setJoinFieldsA);
    if (bMeta) fetchJoinFields(bMeta, setJoinFieldsB);
  }, [aMeta, bMeta]);

  // Auto-suggest method
  useEffect(() => {
    if (!aMeta || !bMeta) return;
    const isRate =
      aMeta.data_format === "percentage" || bMeta.data_format === "percentage";
    if (isRate) setMethod("multiply");
    else setMethod("ratio");
  }, [aMeta, bMeta]);

  // Formula helper presets
  const formulaPresets = [
    { label: "Multiply (A×B)", formula: "a.value * b.value" },
    { label: "Multiply % (A×B/100)", formula: "(a.value * b.value / 100)" },
    { label: "Divide (A÷B)", formula: "a.value / nullif(b.value,0)" },
    { label: "Sum (A+B)", formula: "a.value + b.value" },
    { label: "Difference (A–B)", formula: "a.value - b.value" },
  ];

  // Preview join
  async function handlePreview() {
    if (!aId || !bId) return;
    setLoadingPreview(true);
    setError(null);
    setPreview([]);

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
        datasets: [{ id: aId, join_field: joinA }, { id: bId, join_field: joinB }],
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

  const renderDatasetCard = (meta: any, joinField: string, setJoin: any, joinFields: string[]) => (
    <div className="text-xs mt-1 border rounded p-2 bg-gray-50">
      {meta ? (
        <>
          <div>
            <strong>{meta.title}</strong> — {meta.dataset_type}
            {meta.admin_level ? ` (${meta.admin_level})` : ""}
          </div>
          <div>Format: {meta.data_format}</div>
          <div>Source: {meta.source_table}</div>
          <div>
            Join Field:
            <select
              value={joinField}
              onChange={(e) => setJoin(e.target.value)}
              className="ml-2 border rounded px-1"
            >
              {joinFields.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          {meta.record_count && <div>Records: {meta.record_count}</div>}
        </>
      ) : (
        <div className="italic text-gray-500">No dataset selected.</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Derived Dataset</h2>

        {/* Dataset selectors */}
        <div className="grid grid-cols-2 gap-4">
          {[["A", aId, setAId, aMeta, joinA, setJoinA, joinFieldsA],
            ["B", bId, setBId, bMeta, joinB, setJoinB, joinFieldsB]].map(
            ([label, value, setter, meta, joinField, setJoin, joinFields]) => (
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
                {renderDatasetCard(meta, joinField as string, setJoin, joinFields as string[])}
              </div>
            )
          )}
        </div>

        {/* Join Level */}
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
            {["multiply", "ratio", "sum", "difference", "aggregate", "custom"].map((m) => (
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

        {/* Formula helper + custom field */}
        {method === "custom" && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-gray-600">Custom Formula</label>
              <select
                onChange={(e) => setFormula(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="">Insert preset...</option>
                {formulaPresets.map((p) => (
                  <option key={p.label} value={p.formula}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="mt-1 w-full rounded border p-2 text-xs"
              placeholder="Example: (a.value * b.value / 100)"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use <code>a.value</code> and <code>b.value</code> in your expression.
            </p>
          </div>
        )}

        {/* Round + Unit + Title */}
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Round (decimals)</label>
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
