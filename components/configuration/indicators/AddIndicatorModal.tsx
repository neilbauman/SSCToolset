"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

type Term = {
  id: string;
  category: string;
  name: string;
  code: string;
  category_order: number;
  sort_order: number;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("gradient");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [taxonomy, setTaxonomy] = useState<Term[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadTaxonomy();
  }, [open]);

  async function loadTaxonomy() {
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, category, name, code, category_order, sort_order")
      .order("category_order")
      .order("category")
      .order("sort_order");
    if (error) {
      console.error("Failed to load taxonomy:", error);
      return;
    }
    setTaxonomy(data || []);
  }

  const grouped = taxonomy.reduce<Record<string, Term[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  async function handleSave() {
    if (!name.trim()) return alert("Indicator name is required.");
    setSaving(true);

    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert({
        code: code.trim(),
        name: name.trim(),
        type,
        unit,
        topic,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to save indicator:", error);
      alert("Error creating indicator.");
      setSaving(false);
      return;
    }

    if (selectedIds.length > 0) {
      const links = selectedIds.map((term_id) => ({
        indicator_id: data.id,
        term_id,
      }));
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy")
        .insert(links);
      if (linkErr) console.error("Link error:", linkErr);
    }

    setSaving(false);
    onClose();
    await onSaved();
  }

  function toggleTerm(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator" width="max-w-2xl">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
        </div>

        {/* Taxonomy Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Taxonomy Terms
          </h3>
          {Object.entries(grouped).length === 0 ? (
            <p className="text-xs text-gray-400">No taxonomy terms available.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-md p-2 bg-[var(--gsc-beige)]/30">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-[13px] font-semibold text-[var(--gsc-blue)] mb-1">
                    {cat}
                  </div>
                  <div className="grid grid-cols-2 gap-1 ml-2">
                    {list.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-1 text-xs text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleTerm(t.id)}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md text-white"
            style={{
              background: "var(--gsc-blue)",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Indicator"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
