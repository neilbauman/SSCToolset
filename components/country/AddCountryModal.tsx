"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function AddCountryModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void; // triggers a refresh in parent
}) {
  const [isoCode, setIsoCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!isoCode || !name) {
      setError("ISO code and name are required");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("countries").insert([
        {
          iso_code: isoCode.trim().toUpperCase(),
          name: name.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        setError(insertError.message);
      } else {
        onSave();
        onClose();
        setIsoCode("");
        setName("");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Add Country</h2>

        <label className="block text-sm font-medium mb-1">ISO Code</label>
        <input
          value={isoCode}
          onChange={(e) => setIsoCode(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm mb-3"
          placeholder="e.g. PHL"
        />

        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm mb-3"
          placeholder="e.g. Philippines"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
