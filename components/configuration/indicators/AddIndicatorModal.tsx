"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("gradient");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);

  async function save() {
    setSaving(true);
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert([{ code, name, type, unit, topic }])
      .select()
      .single();

    if (error || !data) {
      alert("Failed to save indicator.");
      console.error(error);
      setSaving(false);
      return;
    }

    if (selectedTaxonomyIds.length > 0) {
      const links = selectedTaxonomyIds.map((tid) => ({
        indicator_id: data.id,
        taxonomy_id: tid,
      }));
      await supabase.from("indicator_taxonomy").insert(links);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-[var(--gsc-gray)]">
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="text-sm text-[var(--gsc-gray)]">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-[var(--gsc-gray)]">
            Unit
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="text-sm text-[var(--gsc-gray)]">
            Topic
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
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
            className="px-3 py-2 text-sm rounded-md bg-[var(--gsc-blue)] text-white hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
