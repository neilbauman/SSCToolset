"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  categoryName: string;
};

export default function EditCategoryModal({
  open,
  onClose,
  onSaved,
  categoryName,
}: Props) {
  const [newName, setNewName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && categoryName) {
      setNewName(categoryName);
      loadDescription();
    }
  }, [open, categoryName]);

  async function loadDescription() {
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("description")
      .eq("category", categoryName)
      .not("description", "is", null)
      .limit(1)
      .single();
    if (!error && data) setDescription(data.description || "");
  }

  async function handleSave() {
    if (!newName.trim()) {
      alert("Category name cannot be empty.");
      return;
    }
    setSaving(true);

    const updates = {
      category: newName.trim(),
      description: description.trim() || null,
    };

    // Update all terms in this category
    const { error } = await supabase
      .from("taxonomy_terms")
      .update(updates)
      .eq("category", categoryName);

    setSaving(false);

    if (error) {
      console.error("Failed to update category:", error);
      alert("Error updating category.");
    } else {
      onClose();
      await onSaved();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Category: ${categoryName}`}
      width="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border rounded-md px-2 py-1 mt-1 text-sm"
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
