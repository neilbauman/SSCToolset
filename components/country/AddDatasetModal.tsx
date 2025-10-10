"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Loader2 } from "lucide-react";

type AddDatasetModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved: () => void;
};

type Indicator = {
  id: string;
  name: string;
  code: string;
  type: "national_statistic" | "disaggregated" | "categorical";
  unit: string | null;
};

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  // 🧭 Load indicators from global catalogue
  useEffect(() => {
    if (!open) return;
    const loadIndicators = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("id, name, code, type, unit")
        .order("name", { ascending: true });
      if (!error && data) setIndicators(data);
      setLoading(false);
    };
    loadIndicators();
  }, [open]);

  const handleSave = async () => {
    if (!selectedIndicator || value === null) return alert("Missing data");
    setSaving(true);

    try {
      // 1️⃣ Insert into indicator_results
      await supabase.from("indicator_results").insert({
        indicator_id: selectedIndicator.id,
        country_iso: countryIso,
        value,
        computed_at: new Date().toISOString(),
        source_info: { name: source, year },
      });

      // 2️⃣ Insert into dataset_metadata
      await supabase.from("dataset_metadata").insert({
        country_iso: countryIso,
        title: selectedIndicator.name,
        description: notes || "",
        indicator_id: selectedIndicator.id,
        dataset_type: selectedIndicator.type,
        upload_type: "manual",
        admin_level: null,
        source: { name: source },
        created_at: new Date().toISOString(),
      });

      onSaved();
      onClose();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5 relative">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Add New Dataset</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading indicators...
          </div>
        ) : (
          <>
            {/* Indicator Selection */}
            <label className="block mb-3 text-sm font-medium">
              Select Indicator
              <select
                value={selectedIndicator?.id || ""}
                onChange={(e) => {
                  const selected = indicators.find(
                    (i) => i.id === e.target.value
                  );
                  setSelectedIndicator(selected || null);
                }}
                className="border rounded w-full mt-1 p-2 text-sm"
              >
                <option value="">-- Select Indicator --</option>
                {indicators.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.type})
                  </option>
                ))}
              </select>
            </label>

            {selectedIndicator?.type === "national_statistic" && (
              <>
                <label className="block mb-3 text-sm font-medium">
                  Value ({selectedIndicator.unit || "value"})
                  <input
                    type="number"
                    step="any"
                    value={value ?? ""}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="border rounded w-full mt-1 p-2 text-sm"
                  />
                </label>
              </>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Year
                <input
                  type="number"
                  value={year ?? ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="border rounded w-full mt-1 p-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Dataset Date
                <input
                  type="date"
                  value={datasetDate}
                  onChange={(e) => setDatasetDate(e.target.value)}
                  className="border rounded w-full mt-1 p-2 text-sm"
                />
              </label>
            </div>

            <label className="block mt-3 text-sm font-medium">
              Source
              <input
                type="text"
                placeholder="e.g. PSA Census 2020"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="border rounded w-full mt-1 p-2 text-sm"
              />
            </label>

            <label className="block mt-3 text-sm font-medium">
              Notes
              <textarea
                placeholder="Optional notes or description"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border rounded w-full mt-1 p-2 text-sm"
              />
            </label>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90 flex items-center gap-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Dataset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
