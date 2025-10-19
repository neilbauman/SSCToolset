"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard({
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
  const [method, setMethod] = useState("ratio");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);
  const [joinField, setJoinField] = useState("admin_pcode");

  // load all dataset sources
  useEffect(() => {
    if (!open) return;
    (async () => {
      const lists: any[] = [];

      const [meta, pop, gis, admin] = await Promise.all([
        supabase.from("dataset_metadata")
          .select("id,title,admin_level,year,dataset_type,data_format")
          .eq("country_iso", countryIso),

        supabase.from("population_dataset_versions")
          .select("id,title:source,year,admin_level")
          .eq("country_iso", countryIso),

        supabase.from("gis_dataset_versions")
          .select("id,title:source,admin_level")
          .eq("country_iso", countryIso),

        supabase.from("admin_dataset_versions")
          .select("id,title:source,year,is_active")
          .eq("country_iso", countryIso)
      ]);

      const all = [
        ...(meta.data || []),
        ...(pop.data || []),
        ...(gis.data || []),
        ...(admin.data || []),
      ];
      setDatasets(all);
    })();
  }, [open, countryIso]);

  // quick preview (first few keys)
  async function previewDataset(id: string, which: "A" | "B") {
    if (!id) return;
    const { data } = await supabase
      .from("dataset_values")
      .select("admin_pcode,value,unit")
      .eq("dataset_id", id)
      .limit(3);

    if (which === "A") setPreviewA(data || []);
    if (which === "B") setPreviewB(data || []);
  }

  const handleCreate = async () => {
    if (!aId || !bId) {
      setError("Select two datasets.");
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
        admin_level: "ADM3",
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
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Derived Dataset</h2>

        {/* select datasets */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Dataset A</label>
            <select
              value={aId}
              onChange={(e) => {
                setAId(e.target.value);
                previewDataset(e.target.value, "A");
              }}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {d.admin_level || d.year || ""}
                </option>
              ))}
            </select>
            {previewA.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                preview ({previewA.length} rows) – keys:{" "}
                {Object.keys(previewA[0] || {}).join(", ")}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Dataset B</label>
            <select
              value={bId}
              onChange={(e) => {
                setBId(e.target.value);
                previewDataset(e.target.value, "B");
              }}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {d.admin_level || d.year || ""}
                </option>
              ))}
            </select>
            {previewB.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                preview ({previewB.length} rows) – keys:{" "}
                {Object.keys(previewB[0] || {}).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* join key */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">Join Field</label>
          <input
            className="mt-1 w-full rounded border p-2"
            value={joinField}
            onChange={(e) => setJoinField(e.target.value)}
          />
        </div>

        {/* method */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">Method</label>
          <div className="mt-1 flex gap-2">
            {["ratio", "sum", "difference"].map((m) => (
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

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

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
