"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Papa from "papaparse";
import { Loader2, Upload } from "lucide-react";

export default function AddDatasetModal({ open, onClose, countryIso, onUploaded }: any) {
  const [indicator, setIndicator] = useState<any | null>(null);
  const [uploadType, setUploadType] = useState("Gradient");
  const [dataType, setDataType] = useState("Percentage");
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleUpload() {
    if (!file) return alert("Please select a CSV file.");
    if (!title) return alert("Title is required.");

    setLoading(true);

    // Parse CSV
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    // Filter valid rows
    const validRows = parsed.data.filter(
      (r: any) =>
        r.pcode &&
        r.value !== null &&
        r.value !== undefined &&
        r.value !== "" &&
        !isNaN(parseFloat(r.value))
    );

    const skipped = parsed.data.length - validRows.length;
    if (skipped > 0) {
      console.warn(`${skipped} rows skipped due to missing or invalid values.`);
    }

    // Insert metadata
    const { data: meta, error: metaError } = await supabase
      .from("dataset_metadata")
      .insert([
        {
          country_iso: countryIso,
          indicator_id: indicator?.id || null,
          title,
          description,
          admin_level: "ADM0",
          upload_type: uploadType.toLowerCase(),
          data_type: dataType.toLowerCase(),
          source: JSON.stringify({
            name: sourceName || null,
            url: sourceUrl || null,
          }),
          year,
        },
      ])
      .select()
      .single();

    if (metaError || !meta) {
      console.error(metaError);
      setLoading(false);
      return alert("Failed to create dataset metadata.");
    }

    const datasetId = meta.id;

    // Insert values
    const { error: valError } = await supabase.from("dataset_values").insert(
      validRows.map((r: any) => ({
        dataset_id: datasetId,
        admin_pcode: r.pcode,
        value: parseFloat(r.value),
        unit: r.unit || null,
        notes: r.notes || null,
      }))
    );

    if (valError) {
      console.error(valError);
      alert(`Upload failed: ${valError.message}`);
    } else {
      if (skipped > 0)
        alert(`Upload complete. ${skipped} rows were skipped due to invalid values.`);
      else alert("Upload complete!");
      onUploaded();
      onClose();
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add New Dataset
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="Dataset title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Upload Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              >
                <option>Gradient</option>
                <option>Categorical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Data Type</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              >
                <option>Percentage</option>
                <option>Numeric</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Year</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Source (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Source name"
                className="border rounded p-2 text-sm"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
              <input
                type="url"
                placeholder="Source URL"
                className="border rounded p-2 text-sm"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded p-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Expected columns: <b>pcode</b>, <b>value</b> (optional: <b>unit</b>,{" "}
              <b>notes</b>)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded p-2 text-sm"
              placeholder="Brief description..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 text-sm rounded text-white flex items-center gap-2"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
