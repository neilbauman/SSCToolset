"use client";

import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"cascade" | "reassign">("cascade");
  const [categories, setCategories] = useState<string[]>([]);
  const [targetCategory, setTargetCategory] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("category")
      .not("category", "is", null);

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    const unique = Array.from(new Set((data || []).map((d) => d.category))).filter(
      (c) => c !== categoryName
    );
    setCategories(unique);
    if (unique.length > 0) setTargetCategory(unique[0]);
  }

  async function handleConfirm() {
    if (confirmText.trim().toLowerCase() !== categoryName.trim().toLowerCase()) {
      alert("Please type the category name exactly to confirm.");
      return;
    }

    setProcessing(true);

    // 1️⃣ Fetch terms in this category
    const { data: terms, error: termErr } = await supabase
      .from("taxonomy_terms")
      .select("id")
      .eq("category", categoryName);

    if (termErr) {
      console.error("Error fetching category terms:", termErr);
      alert("Error fetching category terms.");
      setProcessing(false);
      return;
    }

    const termIds = (terms || []).map((t) => t.id);

    if (termIds.length > 0) {
      if (mode === "cascade") {
        // 2️⃣ Delete indicator links
        const { error: linkErr } = await supabase
          .from("indicator_taxonomy")
          .delete()
          .in("term_id", termIds);
        if (linkErr) console.warn("Error removing linked indicators:", linkErr);

        // 3️⃣ Delete terms
        const { error: delErr } = await supabase
          .from("taxonomy_terms")
          .delete()
          .eq("category", categoryName);
        if (delErr) {
          console.error("Error deleting terms:", delErr);
          alert("Failed to delete terms.");
          setProcessing(false);
          return;
        }
      } else if (mode === "reassign" && targetCategory) {
        // 2️⃣ Reassign all terms to targetCategory
        const { error: updErr } = await supabase
          .from("taxonomy_terms")
          .update({ category: targetCategory })
          .eq("category", categoryName);

        if (updErr) {
          console.error("Error reassigning terms:", updErr);
          alert("Failed to reassign terms.");
          setProcessing(false);
          return;
        }
      }
    }

    setProcessing(false);
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
          You are about to remove the category{" "}
          <span className="font-semibold text-[var(--gsc-red)]">
            {categoryName}
          </span>
          .
        </p>

        <div className="border rounded-md bg-[var(--gsc-beige)] px-3 py-2 text-[13px] text-gray-700">
          <p className="font-medium mb-1">Choose what to do with its terms:</p>
          <label className="flex items-center gap-2 text-sm mb-1">
            <input
              type="radio"
              name="mode"
              value="cascade"
              checked={mode === "cascade"}
              onChange={() => setMode("cascade")}
            />
            Delete all terms and their indicator links (safe cascade)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              value="reassign"
              checked={mode === "reassign"}
              onChange={() => setMode("reassign")}
            />
            Reassign all terms to another category
          </label>

          {mode === "reassign" && (
            <div className="mt-2 ml-5">
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full border rounded-md px-2 py-1 text-sm"
              >
                {categories.length === 0 ? (
                  <option value="">No other categories available</option>
                ) : (
                  categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

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
            onClick={handleConfirm}
            disabled={processing}
            className="px-3 py-2 text-sm rounded-md text-white"
            style={{
              background: "var(--gsc-red)",
              opacity: processing ? 0.6 : 1,
            }}
          >
            {processing ? "Processing..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
