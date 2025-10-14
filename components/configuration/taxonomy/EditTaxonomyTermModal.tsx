"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Term = {
  id: string;
  parent_id: string | null;
  category: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  term: Term;
  existingCategories: string[];
};

export default function EditTaxonomyTermModal({
  open,
  onClose,
  onSaved,
  term,
  existingCategories,
}: Props) {
  const [category, setCategory] = useState(term.category);
  const [code, setCode] = useState(term.code);
  const [name, setName] = useState(term.name);
  const [description, setDescription] = useState(term.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && term) {
      setCategory(term.category);
      setCode(term.code);
      setName(term.name);
      setDescription(term.description ?? "");
      setSaving(false);
    }
  }, [open, term]);

  async function save() {
    if (!name.trim() || !code.trim() || !category.trim()) {
      alert("Category, code, and name are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("taxonomy_terms")
      .update({
        category: category.trim(),
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq("id", term.id);
    setSaving(false);

    if (error) {
      console.error("Failed to update term:", error);
      alert("Failed to update term.");
      return;
    }
    onClose();
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Taxonomy Term"
      width="max-w-xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <label className="text-xs text-gray-600">Category</label>
            <input
              className="w-full border rounded px-2 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="taxonomy-categories-edit"
            />
            <datalist id="taxonomy-categories-edit">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="col-span-5">
            <label className="text-xs text-gray-600">Code</label>
            <input
              className="w-full border rounded px-2 py-2 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="col-span-7">
            <label className="text-xs text-gray-600">Name</label>
            <input
              className="w-full border rounded px-2 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="col-span-12">
            <label className="text-xs text-gray-600">Description</label>
            <textarea
              className="w-full border rounded px-2 py-2 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-green)", color: "white" }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
