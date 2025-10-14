"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function AddCategoryModal({ open, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      alert("Category name is required.");
      return;
    }
    setSaving(true);

    // find current max category_order
    const { data: maxRes, error: maxErr } = await supabase
      .from("taxonomy_terms")
      .select("category_order")
      .order("category_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = maxRes?.category_order ? maxRes.category_order + 1 : 0;

    // Create a placeholder row to register the category
    const { error } = await supabase.from("taxonomy_terms").insert({
      category: name.trim(),
      description: description.trim() || null,
      name: "(category placeholder)",
      code: `CAT_${name.toUpperCase().replace(/\s+/g, "_")}`,
      category_order: nextOrder,
      sort_order: 0,
    });

    setSaving(false);
    if (error) {
      console.error("Error creating category:", error);
      alert("Failed to create category.");
    } else {
      onClose();
      await onSaved();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Category"
      width="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
            placeholder="e.g. Environmental Hazards"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
            placeholder="Optional summary of what this group covers..."
          />
        </div>
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
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
