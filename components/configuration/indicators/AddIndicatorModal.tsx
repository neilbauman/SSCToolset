"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
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
  const [type, setType] = useState<"gradient" | "categorical">("gradient");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("SSC Framework");
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code || !name) {
      alert("Code and Name are required.");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert([{ code, name, type, unit, topic }])
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      alert("Failed to create indicator.");
      return;
    }

    if (taxonomyIds.length > 0) {
      const rows = taxonomyIds.map((termId, idx) => ({
        indicator_id: data.id,
        term_id: termId,
        sort_order: idx + 1,
      }));
      const { error: linkErr } = await supabase.from("indicator_taxonomy_links").insert(rows);
      if (linkErr) console.error(linkErr);
    }

    await onSaved();
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator" width="max-w-3xl">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Taxonomy terms (ordered)
          </label>
          <TaxonomyPicker
            selectedIds={taxonomyIds}
            onChange={setTaxonomyIds}
            allowMultiple
            showOrderControls
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md bg-[color:var(--gsc-blue)] text-white hover:opacity-90 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
