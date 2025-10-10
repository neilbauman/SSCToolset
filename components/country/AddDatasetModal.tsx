"use client";

import { useState, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
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
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [themeFilter, setThemeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [value, setValue] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const [metadata, setMetadata] = useState({
    title: "",
    sourceName: "",
    sourceUrl: "",
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
      else {
        setIndicators(data || []);
        setFilteredIndicators(data || []);
      }
    };
    fetchIndicators();
  }, [open]);

  useEffect(() => {
    let list = [...indicators];
    if (themeFilter) list = list.filter((i) => i.theme === themeFilter);
    if (typeFilter) list = list.filter((i) => i.type === typeFilter);
    if (search)
      list = list.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
      );
    setFilteredIndicators(list);
  }, [themeFilter, typeFilter, search, indicators]);

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

    const sourceJSON =
      metadata.sourceName || metadata.sourceUrl
        ? JSON.stringify({
            name: metadata.sourceName,
            url: metadata.sourceUrl || null,
          })
        : null;

    const newDataset = {
      country_iso: countryIso,
      indicator_id: selectedIndicator.id,
      title: metadata.title || selectedIndicator.name,
      description: selectedIndicator.description,
      source: sourceJSON,
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
      if (!parsedRows.length) {
        alert("Upload a valid CSV with columns: pcode,value");
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

      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        setProgress(
          `Uploading rows ${i + 1}–${Math.min(i + chunkSize, rows.length)} of ${
            rows.length
          }...`
        );
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="Search indicators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          />
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          >
            <option value="">All Themes</option>
            {[...new Set(indicators.map((i) => i.theme))].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          >
            <option value="">All Types</option>
            {[...new Set(indicators.map((i) => i.type))].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">
            Select Indicator
          </label>
          <select
            className="border rounded px-2 py-1 w-full text-sm"
            value={selectedIndicator?.id || ""}
            onChange={(e) =>
              setSelectedIndicator(
                filteredIndicators.find((i) => i.id === e.target.value) || null
              )
            }
          >
            <option value="">— Choose —</option>
            {filteredIndicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.theme ? `${i.theme} – ${i.name}` : i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Admin level */}
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

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
            <label className="block text-sm font-medium mb-1">
              Source Name
            </label>
            <input
              type="text"
              value={metadata.sourceName}
              onChange={(e) =>
                setMetadata({ ...metadata, sourceName: e.target.value })
              }
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source URL</label>
            <input
              type="url"
              value={metadata.sourceUrl}
              onChange={(e) =>
                setMetadata({ ...metadata, sourceUrl: e.target.value })
              }
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
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
