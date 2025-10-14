"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingCategories: string[];
};

export default function AddTaxonomyTermModal({
  open,
  onClose,
  onSaved,
  existingCategories,
}: Props) {
  const [category, setCategory] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("");
      setCode("");
      setName("");
      setDescription("");
      setSaving(false);
    }
  }, [open]);

  async function save() {
    if (!name.trim() || !code.trim() || !category.trim()) {
      alert("Category, code, and name are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("taxonomy_terms").insert({
      category: category.trim(),
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      sort_order: 9999, // will be normalized by view layer
    });
    setSaving(false);
    if (error) {
      console.error("Failed to create term:", error);
      alert("Failed to create term.");
      return;
    }
    onClose();
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Taxonomy Term"
      width="max-w-xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <label className="text-xs text-gray-600">Category</label>
            <div className="flex gap-2">
              <input
                className="w-full border rounded px-2 py-2 text-sm"
                placeholder="e.g., Underlying Vulnerabilities"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="taxonomy-categories"
              />
              <datalist id="taxonomy-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="col-span-5">
            <label className="text-xs text-gray-600">Code</label>
            <input
              className="w-full border rounded px-2 py-2 text-sm"
              placeholder="vuln:demographic"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="col-span-7">
            <label className="text-xs text-gray-600">Name</label>
            <input
              className="w-full border rounded px-2 py-2 text-sm"
              placeholder="Demographics & Social Groups"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="col-span-12">
            <label className="text-xs text-gray-600">Description</label>
            <textarea
              className="w-full border rounded px-2 py-2 text-sm"
              rows={3}
              placeholder="Optional description"
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
            style={{ background: "var(--gsc-blue)", color: "white" }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
