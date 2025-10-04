"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type UploadAdminUnitsModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadAdminUnitsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState("");
  const [datasetDate, setDatasetDate] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const rows = text
        .split("\n")
        .slice(1) // skip header row
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const [pcode, name, level, parent_pcode] = line.split(",");
          return { pcode, name, level, parent_pcode, country_iso: countryIso };
        });

      // Step 1: Insert dataset version metadata
      const { data: version, error: versionError } = await supabase
        .from("admin_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            year: parseInt(year),
            dataset_date: datasetDate,
            source,
            is_active: true,
            notes: notes || null,
          },
        ])
        .select()
        .single();

      if (versionError) {
        console.error("Error inserting dataset version:", versionError);
        alert("Error creating dataset version: " + versionError.message);
        setLoading(false);
        return;
      }

      // Step 2: Insert rows linked to that version
      const rowsWithDataset = rows.map((r) => ({
        ...r,
        dataset_id: version.id,
      }));

      const { error: unitsError } = await supabase
        .from("admin_units")
        .insert(rowsWithDataset);

      if (unitsError) {
        console.error("Error inserting admin units:", unitsError);
        alert("Error inserting admin units: " + unitsError.message);
        setLoading(false);
        return;
      }

      alert("Upload successful!");
      onUploaded();
      onClose();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Unexpected error: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded bg-white p-6 space-y-4 shadow">
          <Dialog.Title className="text-lg font-bold">
            Upload Admin Units Dataset
          </Dialog.Title>

          <p className="text-sm text-gray-600">
            File must include: <code>pcode, name, level, parent_pcode</code>.
            Version metadata will be captured below.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border rounded p-2"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Dataset Date</label>
              <input
                type="date"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g. Philippine Statistics Authority"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border text-sm bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 rounded text-sm text-white bg-[color:var(--gsc-red)] hover:opacity-90"
            >
              {loading ? "Uploading..." : "Upload & Save"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
