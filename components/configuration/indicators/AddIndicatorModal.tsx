"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [taxonomyTerms, setTaxonomyTerms] = useState<any[]>([]);

  useEffect(() => {
    if (open) loadTaxonomy();
  }, [open]);

  async function loadTaxonomy() {
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category, code, description")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) console.error("Failed to load taxonomy_terms:", error);
    else setTaxonomyTerms(data || []);
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert({
        code,
        name,
        type,
        unit,
        topic,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save indicator:", error);
      alert("Failed to save indicator.");
      setSaving(false);
      return;
    }

    const indicatorId = data.id;

    // Insert taxonomy links
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
    <Modal open={open} onClose={onClose} title="Add Indicator" width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full border rounded-md p-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border rounded-md p-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full border rounded-md p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full border rounded-md p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
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
            {saving ? "Saving..." : "Save Indicator"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
