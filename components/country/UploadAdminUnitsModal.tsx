"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const parseCsv = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file first.");
      return;
    }
    setUploading(true);
    setMessage(null);

    try {
      const csvData = await parseCsv(file);
      if (!csvData.length) throw new Error("Empty CSV file.");

      // Create dataset version record
      const { data: version, error: versionError } = await supabase
        .from("admin_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: title || `Admin Units ${new Date().getFullYear()}`,
          year,
          dataset_date: new Date().toISOString().split("T")[0],
          source: sourceName
            ? sourceUrl
              ? `${sourceName} (${sourceUrl})`
              : sourceName
            : null,
          notes,
          is_active: false,
        })
        .select("*")
        .single();

      if (versionError) throw versionError;

      // Normalize and insert admin units
      const levels = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
      const unitsMap = new Map();

      for (const row of csvData) {
        let parentPcode: string | null = null;

        for (let i = 0; i < levels.length; i++) {
          const level = levels[i];
          const name = row[`${level.replace("ADM", "Adm")} Name`];
          const pcode = row[`${level.replace("ADM", "Adm")} Pcode`];

          if (pcode && !unitsMap.has(pcode)) {
            unitsMap.set(pcode, {
              country_iso: countryIso,
              pcode,
              name: name || null,
              level,
              parent_pcode: parentPcode,
              dataset_version_id: version.id,
              metadata: {},
              source: sourceUrl
                ? { name: sourceName || null, url: sourceUrl }
                : sourceName
                ? { name: sourceName }
                : null,
            });
          }

          if (pcode) parentPcode = pcode;
        }
      }

      const units = Array.from(unitsMap.values());
      if (!units.length) throw new Error("No valid admin units found in CSV.");

      const { error: insertError } = await supabase
        .from("admin_units")
        .insert(units);

      if (insertError) throw insertError;

      setMessage(`✅ Uploaded ${units.length} administrative units successfully.`);
      onUploaded();
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Upload Administrative Units
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">Dataset Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm mt-1"
              placeholder="e.g., PSA NAMRIA 2023"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Year (optional)</span>
            <input
              type="number"
              value={year || ""}
              onChange={(e) => setYear(parseInt(e.target.value) || null)}
              className="w-full border rounded px-2 py-1 text-sm mt-1"
              placeholder="e.g., 2023"
            />
          </label>

          <div className="flex gap-2">
            <label className="block text-sm flex-1">
              <span className="text-gray-700">Source Name (optional)</span>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
                placeholder="e.g., PSA, OCHA, NSO"
              />
            </label>

            <label className="block text-sm flex-1">
              <span className="text-gray-700">Source URL (optional)</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
                placeholder="https://example.org"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-700">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm mt-1"
              placeholder="Additional dataset context or metadata"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Select CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 text-sm"
            />
          </label>

          <button
            disabled={uploading}
            onClick={handleUpload}
            className={`mt-2 flex items-center justify-center gap-2 w-full rounded text-white py-2 ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[color:var(--gsc-red)] hover:opacity-90"
            }`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>

          {message && (
            <p className="mt-2 text-sm text-center text-gray-700">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
