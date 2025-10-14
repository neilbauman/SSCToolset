"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("gradient");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);

  async function handleSave() {
    if (!code || !name) {
      alert("Code and Name are required.");
      return;
    }

    setSaving(true);

    // 1) Insert indicator
    const { data: inserted, error } = await supabase
      .from("indicator_catalogue")
      .insert([
        {
          code,
          name,
          type,
          unit,
          topic,
          data_type: unit?.includes("%") ? "percentage" : null,
        },
      ])
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Failed to insert indicator:", error);
      alert("Failed to add indicator.");
      setSaving(false);
      return;
    }

    // 2) Insert taxonomy links (if any)
    if (selectedTaxonomyIds.length > 0) {
      const rows = selectedTaxonomyIds.map((term_id) => ({
        indicator_id: inserted.id,
        term_id,
      }));

      const { error: linkErr } = await supabase
        .from("indicator_taxonomy")
        .insert(rows);

      if (linkErr) {
        console.error("Failed to link taxonomy terms:", linkErr);
        alert("Indicator saved, but taxonomy linking failed.");
        setSaving(false);
        await onSaved();
        onClose();
        return;
      }
    }

    setSaving(false);
    await onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator" width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Code</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SSC_P2_T1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full indicator name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Unit</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="% households"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Topic</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="SSC Framework, Demographics, etc."
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Taxonomy Terms</label>
            <span className="text-xs text-gray-400">{selectedTaxonomyIds.length} selected</span>
          </div>
          {/* Taxonomy picker renders grouped checkboxes.  We hide the code prefix for readability */}
          <TaxonomyPicker
            selectedIds={selectedTaxonomyIds}
            onChange={setSelectedTaxonomyIds}
            hidePrefix
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md text-white flex items-center gap-2"
            style={{ background: "var(--gsc-green)" }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
