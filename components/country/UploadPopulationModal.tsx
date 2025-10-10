"use client";
import { useState, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, X, Loader2 } from "lucide-react";

interface UploadPopulationModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void | Promise<void>;
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(10);

    try {
      // Create new dataset version
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert({
          title: file.name.replace(".csv", ""),
          country_iso: countryIso,
          is_active: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;
      setProgress(30);

      // Parse CSV file
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = values[i];
        });
        return obj;
      });

      // Insert population rows
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        await supabase.from("population_data").insert(
          chunk.map((r) => ({
            ...r,
            country_iso: countryIso,
            dataset_version_id: version.id,
          }))
        );
        setProgress(Math.min(90, Math.round((i / rows.length) * 100)));
      }

      setProgress(100);
      setLoading(false);
      await onUploaded();
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const url =
      "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/population_template.csv";
    const link = document.createElement("a");
    link.href = url;
    link.download = "population_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
            Upload Population Dataset
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          Upload a CSV file containing population data for this country. Use the
          provided template for correct column headers.
        </p>

        <div className="flex justify-between mb-4">
          <button
            onClick={handleDownloadTemplate}
            disabled={loading}
            className="border text-sm px-3 py-1 rounded hover:bg-blue-50 text-blue-700"
          >
            Download Template
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Select File
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {loading && (
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-[color:var(--gsc-red)] h-2 rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
