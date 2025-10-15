"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Cat = { id: string; name: string };
type Term = { id: string; name: string; category: string; category_order?: number; sort_order?: number };

type Group = {
  id: string;
  name: string;
  terms: { id: string; name: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddIndicatorModalNEW({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    resetForm();
    loadTaxonomy();
  }, [open]);

  function resetForm() {
    setCode("");
    setName("");
    setType("");
    setUnit("");
    setTopic("");
    setDescription("");
    setSelectedTerms([]);
  }

  async function loadTaxonomy() {
    // Load categories
    const { data: cats, error: cErr } = await supabase
      .from("taxonomy_categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (cErr) {
      console.error("Failed to load taxonomy categories:", cErr.message);
      setGroups([]);
      return;
    }

    // Load terms (authoritative ordering)
    const { data: terms, error: tErr } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category, category_order, sort_order")
      .order("category_order", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (tErr) {
      console.error("Failed to load taxonomy terms:", tErr.message);
      setGroups([]);
      return;
    }

    const catList: Cat[] = (cats || []) as Cat[];
    const termList: Term[] = (terms || []) as Term[];

    // Group terms by matching taxonomy_terms.category === taxonomy_categories.name
    const grouped: Group[] = catList.map((c) => ({
      id: c.id,
      name: c.name,
      terms: termList
        .filter((t) => t.category === c.name)
        .map((t) => ({ id: t.id, name: t.name })),
    }));

    setGroups(grouped);
  }

  function toggleTerm(termId: string) {
    setSelectedTerms((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    );
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      alert("Code and Name are required.");
      return;
    }

    setSaving(true);

    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description || null,
      type: type || null,
      unit: unit || null,
      topic: topic || null,
      data_type: "numeric",
      input_schema: {},
      formula: null,
      calculation_method: null,
      framework_ref_code: null,
    };

    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      console.error("Insert indicator failed:", error);
      alert("Failed to save indicator: " + error.message);
      setSaving(false);
      return;
    }

    const indicatorId = data?.id as string | undefined;

    if (indicatorId && selectedTerms.length > 0) {
      const rows = selectedTerms.map((taxonomy_id) => ({ indicator_id: indicatorId, taxonomy_id }));
      const { error: linkErr } = await supabase.from("indicator_taxonomy_links").insert(rows);
      if (linkErr) console.error("Failed to link taxonomy terms:", linkErr);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator (NEW)">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Code<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., SSC_P3_T2_S5"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Indicator name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Type</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., gradient"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Unit</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., % households"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Topic</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., SSC Framework"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">Description</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Taxonomy Terms</label>
          <div className="space-y-3 max-h-64 overflow-y-auto border rounded p-2">
            {groups.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No taxonomy available.</div>
            ) : (
              groups.map((g) => (
                <div key={g.id}>
                  <div className="font-medium text-xs text-[var(--gsc-blue)] mb-1">{g.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.terms.map((t) => (
                      <label key={t.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedTerms.includes(t.id)}
                          onChange={() => toggleTerm(t.id)}
                          className="accent-[var(--gsc-blue)]"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--gsc-blue)] text-white rounded flex items-center gap-2"
            disabled={saving}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
