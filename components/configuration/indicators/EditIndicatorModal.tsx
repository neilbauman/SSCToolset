"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  indicatorId: string;
};

export default function EditIndicatorModal({ open, onClose, onSaved, indicatorId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indicator, setIndicator] = useState<any>(null);
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("*")
      .eq("id", indicatorId)
      .single();
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    setIndicator(data);

    const { data: links } = await supabase
      .from("indicator_taxonomy_links")
      .select("taxonomy_id")
      .eq("indicator_id", indicatorId);
    setSelectedTaxonomyIds(links?.map((l) => l.taxonomy_id) || []);
    setLoading(false);
  }

  async function save() {
    setSaving(true);

    // Update main indicator fields
    const { error: updateError } = await supabase
      .from("indicator_catalogue")
      .update({
        code: indicator.code,
        name: indicator.name,
        type: indicator.type,
        unit: indicator.unit,
        topic: indicator.topic,
      })
      .eq("id", indicatorId);

    if (updateError) {
      alert("Failed to update indicator.");
      console.error(updateError);
      setSaving(false);
      return;
    }

    // Fetch current taxonomy links
    const { data: existingLinks, error: fetchError } = await supabase
      .from("indicator_taxonomy_links")
      .select("taxonomy_id")
      .eq("indicator_id", indicatorId);

    if (fetchError) {
      console.error("Failed to load current taxonomy links:", fetchError);
    }

    const existingIds = existingLinks?.map((l) => l.taxonomy_id) || [];
    const toRemove = existingIds.filter((id) => !selectedTaxonomyIds.includes(id));
    const toAdd = selectedTaxonomyIds.filter((id) => !existingIds.includes(id));

    // Remove deselected
    if (toRemove.length > 0) {
      const { error: delError } = await supabase
        .from("indicator_taxonomy_links")
        .delete()
        .eq("indicator_id", indicatorId)
        .in("taxonomy_id", toRemove);
      if (delError) console.error("Failed to delete taxonomy links:", delError);
    }

    // Add new ones
    if (toAdd.length > 0) {
      const inserts = toAdd.map((tid) => ({
        indicator_id: indicatorId,
        taxonomy_id: tid,
      }));
      const { error: insError } = await supabase.from("indicator_taxonomy_links").insert(inserts);
      if (insError) console.error("Failed to insert taxonomy links:", insError);
    }

    setSaving(false);
    onSaved();
    onClose();
  }
  if (!indicator) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Indicator">
      {loading ? (
        <p className="text-sm text-gray-500 italic">Loading...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-[var(--gsc-gray)]">
              Code
              <input
                value={indicator.code}
                onChange={(e) => setIndicator({ ...indicator, code: e.target.value })}
                className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
              />
            </label>
            <label className="text-sm text-[var(--gsc-gray)]">
              Type
              <select
                value={indicator.type}
                onChange={(e) => setIndicator({ ...indicator, type: e.target.value })}
                className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
              >
                <option value="gradient">gradient</option>
                <option value="categorical">categorical</option>
              </select>
            </label>
          </div>

          <label className="text-sm text-[var(--gsc-gray)]">
            Name
            <input
              value={indicator.name}
              onChange={(e) => setIndicator({ ...indicator, name: e.target.value })}
              className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-[var(--gsc-gray)]">
              Unit
              <input
                value={indicator.unit}
                onChange={(e) => setIndicator({ ...indicator, unit: e.target.value })}
                className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
              />
            </label>
            <label className="text-sm text-[var(--gsc-gray)]">
              Topic
              <input
                value={indicator.topic}
                onChange={(e) => setIndicator({ ...indicator, topic: e.target.value })}
                className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--gsc-blue)] mb-1">Taxonomy Terms</p>
            <TaxonomyPicker
              selectedIds={selectedTaxonomyIds}
              onChange={setSelectedTaxonomyIds}
              hidePrefix
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-md border text-[var(--gsc-gray)] hover:bg-[var(--gsc-light-gray)]"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="px-3 py-2 text-sm rounded-md bg-[var(--gsc-green)] text-white hover:bg-green-700"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
