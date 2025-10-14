"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
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
  type: "gradient" | "categorical";
  unit: string;
  topic: string;
};

export default function EditIndicatorModal({ open, indicatorId, onClose, onSaved }: Props) {
  const [model, setModel] = useState<Indicator | null>(null);
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, type, unit, topic")
        .eq("id", indicatorId)
        .single();
      if (data) setModel(data as Indicator);

      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("term_id, sort_order")
        .eq("indicator_id", indicatorId)
        .order("sort_order", { ascending: true });
      setTaxonomyIds((links || []).map((l: any) => l.term_id));
    })();
  }, [open, indicatorId]);

  const updateField = (key: keyof Indicator, value: any) => {
    if (!model) return;
    setModel({ ...model, [key]: value });
  };

  const save = async () => {
    if (!model) return;
    setSaving(true);

    await supabase
      .from("indicator_catalogue")
      .update({
        code: model.code,
        name: model.name,
        type: model.type,
        unit: model.unit,
        topic: model.topic,
      })
      .eq("id", model.id);

    await supabase.from("indicator_taxonomy_links").delete().eq("indicator_id", model.id);

    if (taxonomyIds.length > 0) {
      const rows = taxonomyIds.map((termId, idx) => ({
        indicator_id: model.id,
        term_id: termId,
        sort_order: idx + 1,
      }));
      await supabase.from("indicator_taxonomy_links").insert(rows);
    }

    await onSaved();
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Indicator" width="max-w-3xl">
      {!model ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={model.code}
                onChange={(e) => updateField("code", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={model.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="gradient">gradient</option>
                <option value="categorical">categorical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                value={model.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={model.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              value={model.topic}
              onChange={(e) => updateField("topic", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
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
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
