"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  indicatorId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  topic: string;
};

export default function EditIndicatorModal({ open, indicatorId, onClose, onSaved }: Props) {
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, indicatorId]);

  async function load() {
    setLoading(true);
    // indicator
    const { data: ind, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, unit, topic")
      .eq("id", indicatorId)
      .single();

    if (error || !ind) {
      console.error("Failed to load indicator:", error);
      setLoading(false);
      return;
    }
    setIndicator(ind);

    // taxonomy links
    const { data: links, error: linkErr } = await supabase
      .from("indicator_taxonomy")
      .select("term_id")
      .eq("indicator_id", indicatorId);

    if (linkErr) {
      console.error("Failed to load indicator taxonomy:", linkErr);
      setSelectedTaxonomyIds([]);
      setLoading(false);
      return;
    }

    setSelectedTaxonomyIds((links || []).map((l) => l.term_id));
    setLoading(false);
  }

  async function handleSave() {
    if (!indicator) return;

    setSaving(true);

    // 1) Update indicator core fields
    const { error: upErr } = await supabase
      .from("indicator_catalogue")
      .update({
        code: indicator.code,
        name: indicator.name,
        type: indicator.type,
        unit: indicator.unit,
        topic: indicator.topic,
        data_type: indicator.unit?.includes("%") ? "percentage" : null,
      })
      .eq("id", indicator.id);

    if (upErr) {
      console.error("Failed to update indicator:", upErr);
      alert("Failed to update indicator.");
      setSaving(false);
      return;
    }

    // 2) Replace taxonomy links (simplest).
    const { error: delErr } = await supabase
      .from("indicator_taxonomy")
      .delete()
      .eq("indicator_id", indicator.id);

    if (delErr) {
      console.error("Failed to clear taxonomy:", delErr);
      alert("Indicator updated, but clearing taxonomy failed.");
      setSaving(false);
      await onSaved();
      onClose();
      return;
    }

    if (selectedTaxonomyIds.length > 0) {
      const rows = selectedTaxonomyIds.map((term_id) => ({
        indicator_id: indicator.id,
        term_id,
      }));
      const { error: insErr } = await supabase.from("indicator_taxonomy").insert(rows);
      if (insErr) {
        console.error("Failed to add taxonomy:", insErr);
        alert("Indicator updated, but saving taxonomy failed.");
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
    <Modal open={open} onClose={onClose} title="Edit Indicator" width="max-w-2xl">
      {loading || !indicator ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Code</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={indicator.code}
                onChange={(e) => setIndicator({ ...indicator, code: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={indicator.type}
                onChange={(e) => setIndicator({ ...indicator, type: e.target.value })}
              >
                <option value="gradient">gradient</option>
                <option value="categorical">categorical</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={indicator.name}
                onChange={(e) => setIndicator({ ...indicator, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Unit</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={indicator.unit}
                onChange={(e) => setIndicator({ ...indicator, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Topic</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={indicator.topic}
                onChange={(e) => setIndicator({ ...indicator, topic: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Taxonomy Terms</label>
              <span className="text-xs text-gray-400">{selectedTaxonomyIds.length} selected</span>
            </div>
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
      )}
    </Modal>
  );
}
