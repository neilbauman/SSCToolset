"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

interface EditIndicatorModalProps {
  open: boolean;
  indicatorId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditIndicatorModal({
  open,
  indicatorId,
  onClose,
  onSaved,
}: EditIndicatorModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("");
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([]);

  useEffect(() => {
    async function loadIndicator() {
      if (!indicatorId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("*")
        .eq("id", indicatorId)
        .single();

      if (error) {
        console.error("Error loading indicator:", error);
      } else if (data) {
        setName(data.name || "");
        setCode(data.code || "");
        setUnit(data.unit || "");
        setType(data.type || "");
        setTopic(data.topic || "");
        setSelectedTaxonomies(data.taxonomy_terms || []);
      }
      setLoading(false);
    }
    loadIndicator();
  }, [indicatorId]);

  async function saveIndicator() {
    if (!indicatorId) return;
    setSaving(true);
    const { error } = await supabase
      .from("indicator_catalogue")
      .update({
        name,
        code,
        unit,
        type,
        topic,
        taxonomy_terms: selectedTaxonomies,
        updated_at: new Date().toISOString(),
      })
      .eq("id", indicatorId);
    setSaving(false);

    if (error) {
      console.error("Error updating indicator:", error);
      alert("Failed to update indicator.");
    } else {
      onSaved?.();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Edit Indicator
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxonomy
              </label>
              <TaxonomyPicker
                selectedIds={selectedTaxonomies}
                onChange={setSelectedTaxonomies}
                allowMultiple
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={saveIndicator}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
