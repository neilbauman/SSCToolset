"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload } from "lucide-react";

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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpload = async () => {
    setError(null);

    if (!file || !title || !year) {
      setError("Please provide a Title, Year, and valid CSV file.");
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const rows = text
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());

      if (!headers.includes("pcode") || !headers.includes("population")) {
        throw new Error("Missing required headers: pcode, population");
      }

      const dataRows = rows.slice(1).map((r) => {
        const values = r.split(",").map((v) => v.trim());
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
          record[h] = values[i] ?? "";
        });
        return record;
      });

      if (dataRows.length === 0) {
        throw new Error("No valid rows found in file (missing PCode or population).");
      }

      // Create version
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          year: Number(year),
          dataset_date: datasetDate || null,
          source,
          is_active: isActive,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (versionError) throw versionError;

      const versionId = version.id;

      // Prepare upload records
      const records = dataRows.map((r) => ({
        country_iso: countryIso,
        pcode: r["pcode"],
        population: Number(r["population"]) || 0,
        name: r["name"] || "",
        year: Number(year),
        dataset_id: null,
        dataset_version_id: versionId,
        created_at: new Date().toISOString(),
      }));

      // Upload in chunks (for Supabase limits)
      const chunkSize = 500;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from("population_data")
          .insert(chunk);
        if (insertError) throw insertError;
      }

      // Mark all others inactive if new is active
      if (isActive) {
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: false })
          .eq("country_iso", countryIso)
          .neq("id", versionId);
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: true })
          .eq("id", versionId);
      }

      onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Upload className="w-5 h-5 text-[color:var(--gsc-red)] mr-2" />
          Upload Population Dataset
        </h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded px-2 py-1 w-full mb-3 text-sm"
          placeholder="e.g. 2020 Census Population"
        />

        <label className="block text-sm font-medium mb-1">Year *</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded px-2 py-1 w-full mb-3 text-sm"
        />

        <label className="block text-sm font-medium mb-1">Dataset Date (optional)</label>
        <input
          type="date"
          value={datasetDate}
          onChange={(e) => setDatasetDate(e.target.value)}
          className="border rounded px-2 py-1 w-full mb-3 text-sm"
        />

        <label className="block text-sm font-medium mb-1">Source (optional)</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border rounded px-2 py-1 w-full mb-3 text-sm"
          placeholder="e.g. National Statistics Office"
        />

        <div className="flex items-center mb-4">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm">
            Set as Active after upload
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Upload File *</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded px-2 py-1 w-full text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-3 py-1 text-sm text-white rounded bg-[color:var(--gsc-red)] hover:opacity-90"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
