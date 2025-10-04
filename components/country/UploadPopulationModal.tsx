"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Dialog } from "@headlessui/react";
import { Upload, X } from "lucide-react";
import Papa from "papaparse";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    try {
      if (!file || !title || !year) {
        setError("Please provide a file, title, and year.");
        return;
      }

      setLoading(true);
      setError("");

      // 1️⃣ Create a new version record first
      const { data: versionData, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title,
            year,
            dataset_date: datasetDate || null,
            source,
            is_active: true,
          },
        ])
        .select("id")
        .single();

      if (versionError || !versionData) {
        throw versionError || new Error("Failed to create population version");
      }

      const versionId = versionData.id;

      // 2️⃣ Parse the CSV
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      const rows = parsed.data as any[];

      if (!rows.length) {
        throw new Error("No data found in CSV file.");
      }

      // 3️⃣ Clean and validate rows
      const cleaned = rows
        .filter((r) => r.pcode && r.population)
        .map((r) => ({
          country_iso: countryIso,
          pcode: r.pcode.trim(),
          name: r.name?.trim() || null,
          population: Number(r.population),
          year: Number(year),
          dataset_date: datasetDate || null,
          source: source ? { name: source } : null,
          dataset_version_id: versionId, // ✅ link new version
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      if (!cleaned.length) {
        throw new Error("No valid rows found in file (missing PCode or population).");
      }

      // 4️⃣ Insert all rows
      const { error: insertError } = await supabase
        .from("population_data")
        .insert(cleaned);

      if (insertError) {
        throw insertError;
      }

      setLoading(false);
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
              Upload Population Dataset
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Title *</label>
              <input
                type="text"
                className="border rounded w-full p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2020 Census Data"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Year *</label>
              <input
                type="number"
                className="border rounded w-full p-2 text-sm"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 2020"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Dataset Date</label>
              <input
                type="date"
                className="border rounded w-full p-2 text-sm"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Source (optional)</label>
              <input
                type="text"
                className="border rounded w-full p-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. PSA / NSO / UN Population Division"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Upload File *</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="border rounded w-full p-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
