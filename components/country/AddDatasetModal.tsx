"use client";

import { useState, useEffect } from "react";
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type AddDatasetModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [value, setValue] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [metadata, setMetadata] = useState({
    title: "",
    source: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    const fetchIndicators = async () => {
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("*")
        .order("theme", { ascending: true });
      if (error) console.error("Failed to load indicators", error);
      else setIndicators(data || []);
    };
    fetchIndicators();
  }, [open]);

  if (!open) return null;

  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data);
      },
    });
  };

  const handleUpload = async () => {
    if (!selectedIndicator) return alert("Select an indicator");
    if (!adminLevel) return alert("Select an admin level");

    // Prepare dataset metadata
    const newDataset = {
      country_iso: countryIso,
      indicator_id: selectedIndicator.id,
      title: metadata.title || selectedIndicator.name,
      description: selectedIndicator.description,
      source: metadata.source || null,
      notes: metadata.notes || null,
      admin_level: adminLevel,
      theme: selectedIndicator.theme,
      upload_type: adminLevel === "ADM0" ? "manual" : "csv",
      created_at: new Date().toISOString(),
    };

    setUploading(true);
    setProgress("Saving dataset metadata...");

    const { data: insertedMeta, error: metaError } = await supabase
      .from("dataset_metadata")
      .insert([newDataset])
      .select()
      .single();

    if (metaError || !insertedMeta) {
      console.error("Metadata insert error:", metaError);
      alert("Failed to save dataset metadata.");
      setUploading(false);
      return;
    }

    const datasetId = insertedMeta.id;

    // ADM0 case → single value entry
    if (adminLevel === "ADM0") {
      const singleValue = Number(value);
      if (isNaN(singleValue)) {
        alert("Enter a valid number.");
        setUploading(false);
        return;
      }
      setProgress("Saving national value...");

      const { error } = await supabase.from("indicator_results").insert([
        {
          country_iso: countryIso,
          indicator_id: selectedIndicator.id,
          dataset_id: datasetId,
          admin_level: "ADM0",
          pcode: countryIso,
          value: singleValue,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) console.error("Value insert error:", error);
    } else {
      // CSV upload case
      if (!parsedRows.length) {
        alert("Upload a valid CSV with columns: pcode, value");
        setUploading(false);
        return;
      }

      const rows = parsedRows.map((r) => ({
        country_iso: countryIso,
        indicator_id: selectedIndicator.id,
        dataset_id: datasetId,
        admin_level: adminLevel,
        pcode: r.pcode?.trim(),
        value: Number(r.value),
        created_at: new Date().toISOString(),
      }));

      // Chunk uploads
      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        setProgress(`Uploading rows ${i + 1}–${Math.min(i + chunkSize, rows.length)} of ${rows.length}...`);
        const { error } = await supabase.from("indicator_results").insert(chunk);
        if (error) {
          console.error("Chunk upload error:", error);
          alert(`Upload failed on chunk ${i / chunkSize + 1}`);
          break;
        }
      }
    }

    setUploading(false);
    setProgress("Upload complete ✅");
    onUploaded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-red)]">
            Add Dataset
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600 hover:text-black" />
          </button>
        </div>

        {/* Indicator Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">
            Select Indicator
          </label>
          <select
            className="border rounded px-2 py-1 w-full text-sm"
            value={selectedIndicator?.id || ""}
            onChange={(e) =>
              setSelectedIndicator(
                indicators.find((i) => i.id === e.target.value) || null
              )
            }
          >
            <option value="">— Choose —</option>
            {indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.theme ? `${i.theme} – ${i.name}` : i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Admin level selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">
            Select Admin Level
          </label>
          <select
            className="border rounded px-2 py-1 w-full text-sm"
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Data entry */}
        {adminLevel === "ADM0" ? (
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">
              Enter Value ({selectedIndicator?.data_type || "numeric"})
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
        ) : (
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">
              Upload CSV (columns: pcode,value)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVSelect}
              className="text-sm"
            />
            {csvFile && (
              <p className="text-xs text-gray-600 mt-1">
                Loaded {parsedRows.length} rows from {csvFile.name}
              </p>
            )}
          </div>
        )}

        {/* Metadata fields */}
        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) =>
                setMetadata({ ...metadata, title: e.target.value })
              }
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <input
              type="text"
              value={metadata.source}
              onChange={(e) =>
                setMetadata({ ...metadata, source: e.target.value })
              }
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={metadata.notes}
            onChange={(e) =>
              setMetadata({ ...metadata, notes: e.target.value })
            }
            className="border rounded px-2 py-1 w-full text-sm"
            rows={2}
          />
        </div>

        {uploading ? (
          <div className="flex items-center text-gray-700 text-sm gap-2">
            <Loader2 className="animate-spin w-4 h-4" />
            {progress}
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm border rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
            >
              Save Dataset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
