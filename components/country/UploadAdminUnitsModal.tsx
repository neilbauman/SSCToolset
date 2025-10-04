"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type UploadAdminUnitsModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => void;
};

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadAdminUnitsModalProps) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [datasetDate, setDatasetDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [source, setSource] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) {
      alert("Please provide a dataset title and select a file.");
      return;
    }
    setLoading(true);

    try {
      // Step 1. Insert a dataset version row
      const { data: version, error: versionError } = await supabase
        .from("admin_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title,
            year,
            dataset_date: datasetDate,
            source,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (versionError) {
        console.error("Error creating dataset version:", versionError);
        alert(`Error creating dataset version: ${versionError.message}`);
        setLoading(false);
        return;
      }

      // Step 2. Parse CSV rows
      const text = await file.text();
      const rows = text
        .split("\n")
        .slice(1) // skip header
        .map((line) => {
          if (!line.trim()) return null;
          const [pcode, name, level, parent_pcode] = line.split(",");
          return {
            pcode: pcode?.trim(),
            name: name?.trim(),
            level: level?.trim(),
            parent_pcode: parent_pcode?.trim() || null,
            country_iso: countryIso,
            version_id: version.id,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) {
        alert("No rows found in the uploaded CSV.");
        setLoading(false);
        return;
      }

      // Step 3. Insert admin units
      const { error: unitsError } = await supabase
        .from("admin_units")
        .insert(rows as any[]);

      if (unitsError) {
        console.error("Error inserting admin units:", unitsError);
        alert(`Error inserting admin units: ${unitsError.message}`);
      } else {
        onUploaded?.();
        onClose();
      }
    } catch (err: any) {
      console.error("Unexpected error uploading admin dataset:", err);
      alert("Unexpected error during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg space-y-4">
        <Dialog.Title className="text-lg font-semibold">
          Upload Admin Units Dataset
        </Dialog.Title>

        <div>
          <label className="block text-sm font-medium">Dataset Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Philippines Admin Boundaries 2020"
            className="mt-1 w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Dataset Date</label>
          <input
            type="date"
            value={datasetDate}
            onChange={(e) => setDatasetDate(e.target.value)}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source name or URL"
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-2 bg-[color:var(--gsc-red)] text-white rounded disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload & Save"}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
