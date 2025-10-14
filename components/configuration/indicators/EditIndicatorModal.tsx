"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  indicatorId: string;
  onSaved: () => Promise<void>;
};

export default function EditIndicatorModal({
  open,
  onClose,
  indicatorId,
  onSaved,
}: Props) {
  const [indicator, setIndicator] = useState<any>(null);
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && indicatorId) loadIndicator();
  }, [open, indicatorId]);

  async function loadIndicator() {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select(
        "id, code, name, type, unit, topic, indicator_taxonomy_links (taxonomy_id)"
      )
      .eq("id", indicatorId)
      .single();

    if (error) {
      console.error("Failed to load indicator:", error);
      return;
    }

    setIndicator(data);
    setSelectedTaxonomyIds(
      data.indicator_taxonomy_links?.map((l: any) => l.taxonomy_id) || []
    );
  }

  async function handleSave() {
    if (!indicator) return;
    setSaving(true);

    const { error } = await supabase
      .from("indicator_catalogue")
      .update({
        code: indicator.code,
        name: indicator.name,
        type: indicator.type,
        unit: indicator.unit,
        topic: indicator.topic,
      })
      .eq("id", indicatorId);

    if (error) {
      console.error("Failed to update indicator:", error);
      alert("Error updating indicator.");
      setSaving(false);
      return;
    }

    // Delete old taxonomy links
    await supabase.from("indicator_taxonomy_links").delete().eq("indicator_id", indicatorId);

    // Insert new taxonomy links
    if (selectedTaxonomyIds.length > 0) {
      const inserts = selectedTaxonomyIds.map((tid) => ({
        indicator_id: indicatorId,
        taxonomy_id: tid,
      }));
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy_links")
        .insert(inserts);
      if (linkErr) console.error("Failed to insert taxonomy links:", linkErr);
    }

    setSaving(false);
    await onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Indicator" width="max-w-2xl">
      {indicator ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Code</label>
            <input
              type="text"
              value={indicator.code}
              onChange={(e) =>
                setIndicator({ ...indicator, code: e.target.value })
              }
              className="mt-1 w-full border rounded-md p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={indicator.name}
              onChange={(e) =>
                setIndicator({ ...indicator, name: e.target.value })
              }
              className="mt-1 w-full border rounded-md p-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <input
                type="text"
                value={indicator.type}
                onChange={(e) =>
                  setIndicator({ ...indicator, type: e.target.value })
                }
                className="mt-1 w-full border rounded-md p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={indicator.unit}
                onChange={(e) =>
                  setIndicator({ ...indicator, unit: e.target.value })
                }
                className="mt-1 w-full border rounded-md p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Topic</label>
              <input
                type="text"
                value={indicator.topic}
                onChange={(e) =>
                  setIndicator({ ...indicator, topic: e.target.value })
                }
                className="mt-1 w-full border rounded-md p-2 text-sm"
              />
            </div>
          </div>

          {/* Taxonomy Terms */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Taxonomy Terms
            </label>
            <TaxonomyPicker
              selectedIds={selectedTaxonomyIds}
              onChange={setSelectedTaxonomyIds}
              allowMultiple
              hidePrefix
            />
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-md border text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 text-sm rounded-md"
              style={{ background: "var(--gsc-blue)", color: "white" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Loading indicator...</div>
      )}
    </Modal>
  );
}
