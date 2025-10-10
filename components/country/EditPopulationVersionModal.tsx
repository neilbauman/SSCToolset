"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface EditPopulationVersionModalProps {
  versionId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function EditPopulationVersionModal({
  versionId,
  onClose,
  onSaved,
}: EditPopulationVersionModalProps) {
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      const { data } = await supabase
        .from("population_dataset_versions")
        .select("*")
        .eq("id", versionId)
        .maybeSingle();
      setVersion(data);
    };
    fetchVersion();
  }, [versionId]);

  const handleSave = async () => {
    if (!version) return;
    setLoading(true);
    try {
      const { id, title, year, dataset_date, source, notes } = version;
      await supabase
        .from("population_dataset_versions")
        .update({
          title: title?.trim() || null,
          year: year || null,
          dataset_date: dataset_date || null,
          source:
            source && typeof source === "object"
              ? JSON.stringify(source)
              : source || null,
          notes: notes || null,
        })
        .eq("id", id);
      await onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  if (!version) return null;

  const handleSourceChange = (field: "name" | "url", value: string) => {
    setVersion((v: any) => ({
      ...v,
      source: {
        ...(typeof v.source === "object"
          ? v.source
          : (() => {
              try {
                return JSON.parse(v.source || "{}");
              } catch {
                return {};
              }
            })()),
        [field]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Edit Population Version</h3>
        <div className="space-y-2 text-sm">
          {["title", "year", "dataset_date", "notes"].map((f) => (
            <label key={f} className="block capitalize">
              {f.replace("_", " ")}
              <input
                type={
                  f === "year" ? "number" : f === "dataset_date" ? "date" : "text"
                }
                value={version[f] ?? ""}
                onChange={(e) =>
                  setVersion({ ...version, [f]: e.target.value || null })
                }
                className="border rounded w-full px-2 py-1 mt-1 text-sm"
              />
            </label>
          ))}

          <label className="block">Source Name</label>
          <input
            type="text"
            value={
              typeof version.source === "object"
                ? version.source?.name || ""
                : (() => {
                    try {
                      return JSON.parse(version.source || "{}").name || "";
                    } catch {
                      return "";
                    }
                  })()
            }
            onChange={(e) => handleSourceChange("name", e.target.value)}
            className="border rounded w-full px-2 py-1 mt-1 text-sm"
          />

          <label className="block mt-2">Source URL (optional)</label>
          <input
            type="url"
            value={
              typeof version.source === "object"
                ? version.source?.url || ""
                : (() => {
                    try {
                      return JSON.parse(version.source || "{}").url || "";
                    } catch {
                      return "";
                    }
                  })()
            }
            onChange={(e) => handleSourceChange("url", e.target.value)}
            className="border rounded w-full px-2 py-1 mt-1 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
