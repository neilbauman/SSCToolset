"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";

type Props = {
  open: boolean;
  indicatorId: string;
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

export default function EditIndicatorModal({
  open,
  indicatorId,
  onClose,
  onSaved,
}: Props) {
  const [indicator, setIndicator] = useState<any>(null);
  const [taxonomy, setTaxonomy] = useState<Term[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && indicatorId) {
      loadIndicator();
      loadTaxonomy();
    }
  }, [open, indicatorId]);

  async function loadIndicator() {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("*")
      .eq("id", indicatorId)
      .single();

    if (!error && data) {
      setIndicator(data);
      const { data: links } = await supabase
        .from("indicator_taxonomy")
        .select("term_id")
        .eq("indicator_id", indicatorId);
      setSelectedIds((links || []).map((l) => l.term_id));
    }
  }

  async function loadTaxonomy() {
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, category, name, code, category_order, sort_order")
      .order("category_order")
      .order("category")
      .order("sort_order");
    if (error) console.error(error);
    setTaxonomy(data || []);
  }

  const grouped = taxonomy.reduce<Record<string, Term[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  function toggleTerm(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!indicator) return;
    setSaving(true);

    const { error: updErr } = await supabase
      .from("indicator_catalogue")
      .update({
        code: indicator.code,
        name: indicator.name,
        type: indicator.type,
        unit: indicator.unit,
        topic: indicator.topic,
      })
      .eq("id", indicator.id);

    if (updErr) {
      console.error("Update failed:", updErr);
      alert("Error saving indicator.");
      setSaving(false);
      return;
    }

    await supabase.from("indicator_taxonomy").delete().eq("indicator_id", indicator.id);

    if (selectedIds.length > 0) {
      const links = selectedIds.map((term_id) => ({
        indicator_id: indicator.id,
        term_id,
      }));
      await supabase.from("indicator_taxonomy").insert(links);
    }

    setSaving(false);
    onClose();
    await onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Indicator"
      width="max-w-2xl"
    >
      {!indicator ? (
        <p className="text-sm text-gray-500">Loading indicator...</p>
      ) : (
        <div className="space-y-4">
          {/* Indicator fields */}
          <div className="grid grid-cols-2 gap-4">
            {["code", "name", "unit", "topic"].map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-gray-700 capitalize">
                  {field}
                </label>
                <input
                  value={indicator[field] || ""}
                  onChange={(e) =>
                    setIndicator((prev: any) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Taxonomy */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Taxonomy Terms
            </h3>
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
