"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type TaxonomyCategory = {
  id: string;
  name: string;
  terms: { id: string; name: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadTaxonomy();
  }, [open]);

  async function loadTaxonomy() {
    const { data, error } = await supabase
      .from("taxonomy_categories")
      .select("id, name, taxonomy_terms ( id, name )")
      .order("name");

    if (error) {
      console.error("Error loading taxonomy:", error.message);
      return;
    }

    const mapped =
      data?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        terms: cat.taxonomy_terms || [],
      })) || [];
    setTaxonomy(mapped);
  }

  function toggleTerm(id: string) {
    setSelectedTermIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      alert("Code and Name are required.");
      return;
    }

    setSaving(true);

    const insertData = {
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
      .insert([insertData])
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      alert("Failed to save indicator: " + error.message);
      setSaving(false);
      return;
    }

    const indicatorId = data?.id;
    if (indicatorId && selectedTermIds.length > 0) {
      const linkRows = selectedTermIds.map((termId) => ({
        indicator_id: indicatorId,
        taxonomy_id: termId,
      }));
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy_links")
        .insert(linkRows);

      if (linkErr) console.error("Failed to link taxonomy terms:", linkErr);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Code<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SSC_P1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Indicator name"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Type</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., gradient"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Unit</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., % households"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Topic</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., SSC Framework"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">
            Description
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Taxonomy Terms
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
            {taxonomy.map((cat) => (
              <div key={cat.id}>
                <div className="font-medium text-xs text-[var(--gsc-blue)] mb-1">
                  {cat.name}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {cat.terms.map((term) => (
                    <label
                      key={term.id}
                      className="flex items-center gap-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTermIds.includes(term.id)}
                        onChange={() => toggleTerm(term.id)}
                      />
                      {term.name}
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
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-[var(--gsc-blue)] text-white rounded flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
