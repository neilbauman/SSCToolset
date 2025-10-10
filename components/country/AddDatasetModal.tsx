"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Loader2, AlertCircle } from "lucide-react";

interface AddDatasetModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved?: () => void;
}

interface Indicator {
  id: string;
  code: string;
  name: string;
  theme: string;
  type: string;
  data_type: string;
  default_admin_level: string;
}

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // form data
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(
    null
  );
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");

  // load indicator list
  useEffect(() => {
    if (!open) return;
    const loadIndicators = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, theme, type, data_type, default_admin_level")
        .order("theme", { ascending: true });

      if (error) {
        console.error("Indicator fetch failed:", error);
        setErrorMsg("Failed to load indicators.");
      } else {
        setIndicators(data || []);
      }
      setLoading(false);
    };
    loadIndicators();
  }, [open]);

  const handleSave = async () => {
    setErrorMsg(null);

    if (!selectedIndicator) {
      setErrorMsg("Please select an indicator.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }
    if (!value.trim()) {
      setErrorMsg("Please enter a value.");
      return;
    }

    setSaving(true);
    const sourceJSON =
      sourceName || sourceUrl
        ? JSON.stringify({ name: sourceName, url: sourceUrl })
        : null;

    const newDataset = {
      country_iso: countryIso,
      indicator_id: selectedIndicator.id, // ✅ valid FK UUID
      title: title.trim(),
      description: notes.trim() || null,
      source: sourceJSON,
      admin_level: adminLevel,
      theme: selectedIndicator.theme || null,
      upload_type: "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("dataset_metadata")
      .insert([newDataset]);

    if (insertError) {
      console.error("Insert failed:", insertError);
      setErrorMsg(
        insertError.message || "Failed to save dataset metadata (unknown error)."
      );
      setSaving(false);
      return;
    }

    // save value into results table (if exists)
    try {
      const { error: resultError } = await supabase
        .from("indicator_results")
        .insert([
          {
            indicator_id: selectedIndicator.id,
            country_iso: countryIso,
            admin_level: adminLevel,
            pcode: null,
            value: Number(value),
            data_type: selectedIndicator.data_type,
            created_at: new Date().toISOString(),
          },
        ]);

      if (resultError) {
        console.warn("Value insert warning:", resultError);
      }
    } catch (e) {
      console.warn("No indicator_results table found:", e);
    }

    setSaving(false);
    if (onSaved) onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-[color:var(--gsc-red)] mb-4">
          Add Dataset
        </h2>

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-100 text-red-700 text-sm p-2 rounded mb-3">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <Loader2 className="animate-spin w-4 h-4" />
            Loading indicators...
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <label className="block font-medium mb-1">
                Select Indicator <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedIndicator?.id || ""}
                onChange={(e) =>
                  setSelectedIndicator(
                    indicators.find((i) => i.id === e.target.value) || null
                  )
                }
                className="border rounded w-full px-2 py-1"
              >
                <option value="">-- Select Indicator --</option>
                {indicators.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.theme} – {ind.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">
                Select Admin Level <span className="text-red-500">*</span>
              </label>
              <select
                value={adminLevel}
                onChange={(e) => setAdminLevel(e.target.value)}
                className="border rounded w-full px-2 py-1"
              >
                {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((adm) => (
                  <option key={adm} value={adm}>
                    {adm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">
                Value ({selectedIndicator?.data_type || "numeric"}){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="border rounded w-full px-2 py-1"
                placeholder="Enter value (e.g. 5 or 1.25)"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border rounded w-full px-2 py-1"
                placeholder="Dataset title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Source Name</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="border rounded w-full px-2 py-1"
                  placeholder="e.g. World Bank"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Source URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="border rounded w-full px-2 py-1"
                  placeholder="https://example.org/dataset"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border rounded w-full px-2 py-1"
                rows={3}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Dataset"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
