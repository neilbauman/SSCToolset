"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Country = {
  iso_code: string;
  name: string;
  adm0_label?: string;
  adm1_label?: string;
  adm2_label?: string;
  adm3_label?: string;
  adm4_label?: string;
  adm5_label?: string;
  dataset_sources?: { name: string; url?: string }[];
  extra_metadata?: Record<string, { label: string; value: string; url?: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave?: () => Promise<void>;
  mode: "add" | "edit";
  initialCountry: Country | null;
};

export default function EditCountryModal({
  open,
  onClose,
  onSave,
  mode,
  initialCountry,
}: Props) {
  const [form, setForm] = useState<Country>({
    iso_code: "",
    name: "",
    adm0_label: "",
    adm1_label: "",
    adm2_label: "",
    adm3_label: "",
    adm4_label: "",
    adm5_label: "",
    dataset_sources: [],
    extra_metadata: {},
  });

  useEffect(() => {
    if (initialCountry) setForm(initialCountry);
  }, [initialCountry]);

  if (!open) return null;

  const handleChange = (key: keyof Country, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const { error } = await supabase.from("countries").upsert({
      iso_code: form.iso_code.trim(),
      name: form.name.trim(),
      adm0_label: form.adm0_label || null,
      adm1_label: form.adm1_label || null,
      adm2_label: form.adm2_label || null,
      adm3_label: form.adm3_label || null,
      adm4_label: form.adm4_label || null,
      adm5_label: form.adm5_label || null,
      dataset_sources: form.dataset_sources || [],
      extra_metadata: form.extra_metadata || {},
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving country:", error);
      alert("Error saving country. Check console for details.");
      return;
    }

    if (onSave) await onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {mode === "add" ? "Add New Country" : `Edit ${form.name}`}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">ISO Code</label>
            <input
              type="text"
              value={form.iso_code}
              onChange={(e) => handleChange("iso_code", e.target.value.toUpperCase())}
              disabled={mode === "edit"}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          {/* Admin Labels */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <label className="block text-gray-700 font-medium mb-1">
                ADM{i} Label
              </label>
              <input
                type="text"
                value={(form as any)[`adm${i}_label`] || ""}
                onChange={(e) =>
                  handleChange(`adm${i}_label` as keyof Country, e.target.value)
                }
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          ))}
        </div>

        {/* Dataset Sources */}
        <div className="mt-5">
          <label className="block text-gray-700 font-medium mb-1">
            Dataset Sources (optional)
          </label>
          {form.dataset_sources && form.dataset_sources.length > 0 ? (
            <ul className="mb-2 space-y-1">
              {form.dataset_sources.map((src, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={src.name}
                    onChange={(e) => {
                      const updated = [...(form.dataset_sources || [])];
                      updated[i].name = e.target.value;
                      handleChange("dataset_sources", updated);
                    }}
                    className="border rounded px-2 py-1 w-1/2"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={src.url || ""}
                    onChange={(e) => {
                      const updated = [...(form.dataset_sources || [])];
                      updated[i].url = e.target.value;
                      handleChange("dataset_sources", updated);
                    }}
                    className="border rounded px-2 py-1 w-1/2"
                  />
                  <button
                    onClick={() => {
                      const updated = form.dataset_sources!.filter((_, idx) => idx !== i);
                      handleChange("dataset_sources", updated);
                    }}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 italic mb-2 text-sm">No sources added yet.</p>
          )}
          <button
            onClick={() =>
              handleChange("dataset_sources", [
                ...(form.dataset_sources || []),
                { name: "", url: "" },
              ])
            }
            className="text-blue-600 text-sm hover:underline"
          >
            + Add Source
          </button>
        </div>

        {/* Extra Metadata */}
        <div className="mt-5">
          <label className="block text-gray-700 font-medium mb-1">
            Extra Metadata (optional)
          </label>
          {form.extra_metadata && Object.keys(form.extra_metadata).length > 0 ? (
            <ul className="mb-2 space-y-1">
              {Object.entries(form.extra_metadata).map(([key, entry]) => (
                <li key={key} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={entry.label}
                    onChange={(e) =>
                      handleChange("extra_metadata", {
                        ...form.extra_metadata,
                        [key]: { ...entry, label: e.target.value },
                      })
                    }
                    className="border rounded px-2 py-1 w-1/3"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={entry.value}
                    onChange={(e) =>
                      handleChange("extra_metadata", {
                        ...form.extra_metadata,
                        [key]: { ...entry, value: e.target.value },
                      })
                    }
                    className="border rounded px-2 py-1 w-1/3"
                  />
                  <input
                    type="text"
                    placeholder="URL (optional)"
                    value={entry.url || ""}
                    onChange={(e) =>
                      handleChange("extra_metadata", {
                        ...form.extra_metadata,
                        [key]: { ...entry, url: e.target.value },
                      })
                    }
                    className="border rounded px-2 py-1 w-1/3"
                  />
                  <button
                    onClick={() => {
                      const updated = { ...form.extra_metadata };
                      delete updated[key];
                      handleChange("extra_metadata", updated);
                    }}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 italic mb-2 text-sm">No metadata added yet.</p>
          )}
          <button
            onClick={() =>
              handleChange("extra_metadata", {
                ...form.extra_metadata,
                [`key_${Object.keys(form.extra_metadata || {}).length + 1}`]: {
                  label: "",
                  value: "",
                  url: "",
                },
              })
            }
            className="text-blue-600 text-sm hover:underline"
          >
            + Add Metadata
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-6 space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded text-sm bg-[color:var(--gsc-red)] text-white hover:opacity-90"
          >
            {mode === "add" ? "Add Country" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
