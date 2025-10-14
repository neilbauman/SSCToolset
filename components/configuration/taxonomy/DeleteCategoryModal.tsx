"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  onDeleted: () => Promise<void>;
};

export default function DeleteCategoryModal({
  open,
  onClose,
  categoryName,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleDelete() {
    if (confirmText.trim().toLowerCase() !== categoryName.trim().toLowerCase()) {
      alert("Please type the category name exactly to confirm.");
      return;
    }

    setDeleting(true);

    // 1️⃣ Fetch all term IDs in this category
    const { data: terms, error: termsErr } = await supabase
      .from("taxonomy_terms")
      .select("id")
      .eq("category", categoryName);

    if (termsErr) {
      console.error("Failed to load terms:", termsErr);
      alert("Error fetching category terms.");
      setDeleting(false);
      return;
    }

    const termIds = (terms || []).map((t) => t.id);
    if (termIds.length > 0) {
      // 2️⃣ Remove indicator links referencing these terms
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy")
        .delete()
        .in("term_id", termIds);
      if (linkErr) console.warn("Error removing links:", linkErr);

      // 3️⃣ Delete all taxonomy terms in this category
      const { error: delErr } = await supabase
        .from("taxonomy_terms")
        .delete()
        .eq("category", categoryName);

      if (delErr) {
        console.error("Failed to delete terms:", delErr);
        alert("Failed to delete category terms.");
        setDeleting(false);
        return;
      }
    }

    setDeleting(false);
    onClose();
    await onDeleted();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Category"
      width="max-w-md"
    >
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          You are about to permanently delete the entire category{" "}
          <span className="font-semibold text-[var(--gsc-red)]">
            {categoryName}
          </span>
          .
        </p>
        <p className="text-[13px] text-gray-600">
          This will also remove all taxonomy terms in the category and any
          indicator links referencing those terms.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type the category name to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border rounded-md px-2 py-1 text-sm"
            placeholder={categoryName}
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
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 text-sm rounded-md text-white"
            style={{
              background: "var(--gsc-red)",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Delete Category"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
