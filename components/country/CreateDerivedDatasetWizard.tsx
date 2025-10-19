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

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,admin_level,year,data_format")
        .eq("country_iso", countryIso)
        .in("data_format", ["numeric", "percentage"]);
      if (!error && data) setDatasets(data);
    })();
  }, [open, countryIso]);

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
        admin_level: "ADM3", // MVP assumption (same level)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Derived Dataset</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Dataset A</label>
            <select
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {d.admin_level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Dataset B</label>
            <select
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {d.admin_level}
                </option>
              ))}
            </select>
          </div>
        </div>

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
