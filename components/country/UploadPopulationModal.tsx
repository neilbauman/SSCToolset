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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title || !year || !sourceName) {
      alert("Please fill in all required fields before uploading.");
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // Create version metadata first
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert({
          title: title.trim(),
          country_iso: countryIso,
          year,
          source_name: sourceName.trim(),
          source_url: sourceUrl?.trim() || null,
          notes: notes?.trim() || null,
          is_active: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;
      setProgress(25);

      // Parse CSV rows (headers: pcode, name, population)
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        const record: Record<string, any> = {};
        headers.forEach((h, i) => (record[h] = values[i]));
        return record;
      });

      if (!headers.includes("pcode") || !headers.includes("population")) {
        throw new Error("CSV must include 'pcode' and 'population' columns.");
      }

      // Insert data in chunks
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        await supabase.from("population_data").insert(
          chunk.map((r) => ({
            pcode: r.pcode,
            name: r.name || null,
            population: Number(r.population) || 0,
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
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console for details.");
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
            Upload Population Dataset
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <label className="block">
            Title *
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="block">
            Year *
            <input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(Number(e.target.value) || null)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="block">
            Source Name *
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="block">
            Source URL
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            />
          </label>
          <label className="block">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            />
          </label>
        </div>

        <div className="flex justify-between items-center mt-4">
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
                Select CSV
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
          <div className="mt-3 w-full bg-gray-200 h-2 rounded">
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
