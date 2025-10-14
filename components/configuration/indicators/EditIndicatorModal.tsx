"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  topic: string;
};

type Term = {
  id: string;
  category: string;
  code: string;
  name: string;
};

type Props = {
  open: boolean;
  indicatorId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function EditIndicatorModal({ open, indicatorId, onClose, onSaved }: Props) {
  const [model, setModel] = useState<Indicator | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: indicator } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, type, unit, topic")
        .eq("id", indicatorId)
        .single();
      if (indicator) setModel(indicator);

      const { data: taxonomy } = await supabase
        .from("taxonomy_terms")
        .select("id, category, code, name")
        .order("category", { ascending: true })
        .order("code", { ascending: true });
      if (taxonomy) setTerms(taxonomy);

      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("term_id")
        .eq("indicator_id", indicatorId);
      if (links) setSelected(links.map((l) => l.term_id));
    })();
  }, [open, indicatorId]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const update = async () => {
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

    if (selected.length > 0) {
      const rows = selected.map((termId, idx) => ({
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

  const grouped = terms.reduce<Record<string, Term[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || [];
    acc[t.category].push(t);
    return acc;
  }, {});

  if (!model)
    return (
      <Modal open={open} onClose={onClose} title="Edit Indicator">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </Modal>
    );

  return (
    <Modal open={open} onClose={onClose} title="Edit Indicator" width="max-w-3xl">
      <div className="space-y-4">
        {/* Editable indicator fields */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              value={model.code}
              onChange={(e) => setModel({ ...model, code: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={model.name}
              onChange={(e) => setModel({ ...model, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={model.type}
              onChange={(e) => setModel({ ...model, type: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <input
              value={model.unit}
              onChange={(e) => setModel({ ...model, unit: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              value={model.topic}
              onChange={(e) => setModel({ ...model, topic: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Taxonomy selection */}
        <div>
          <h3 className="text-sm font-medium text-[color:var(--gsc-blue)] mb-2">
            Taxonomy Terms
          </h3>
          <div className="max-h-72 overflow-y-auto border rounded-md p-3 bg-[color:var(--gsc-beige)]">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat} className="mb-3">
                <h4 className="text-sm font-semibold text-[color:var(--gsc-gray)] mb-1">
                  {cat}
                </h4>
                <div className="grid grid-cols-2 gap-x-3">
                  {list.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-sm bg-white rounded px-2 py-1 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={() => toggle(t.id)}
                        className="accent-[color:var(--gsc-blue)]"
                      />
                      <span className="truncate">
                        <span className="font-mono text-xs text-gray-600 mr-1">
                          {t.code}
                        </span>
                        {t.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={update}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md bg-[color:var(--gsc-blue)] text-white hover:opacity-90 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
