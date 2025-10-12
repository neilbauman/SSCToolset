"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Upload, Info, Search } from "lucide-react";

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void>;
}) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any | null>(null);
  const [uploadType, setUploadType] = useState("gradient");
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [adminLevel, setAdminLevel] = useState<string>("ADM1");
  const [dataType, setDataType] = useState("numeric");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Load indicators
  useEffect(() => {
    async function loadIndicators() {
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, description, type, theme, data_type");
      if (!error && data) {
        setIndicators(data);
        setFilteredIndicators(data);
      }
    }
    if (open) loadIndicators();
  }, [open]);

  // 🔹 Load available admin levels
  useEffect(() => {
    async function loadAdminLevels() {
      const { data, error } = await supabase
        .from("admin_units")
        .select("level")
        .eq("country_iso", countryIso);
      if (error) console.error("Admin level fetch error:", error);
      else if (data) {
        const lvls = Array.from(new Set(data.map((d) => d.level))).sort();
        setAdminLevels(lvls);
      }
    }
    if (open) loadAdminLevels();
  }, [open, countryIso]);

  // 🔍 Filter indicator list
  useEffect(() => {
    if (!searchTerm) setFilteredIndicators(indicators);
    else {
      const term = searchTerm.toLowerCase();
      setFilteredIndicators(
        indicators.filter(
          (i) =>
            i.name.toLowerCase().includes(term) ||
            i.code.toLowerCase().includes(term) ||
            i.theme?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, indicators]);

  // 📤 Handle upload
  async function handleUpload() {
    if (!file) {
      alert("Please select a CSV file to upload.");
      return;
    }

    try {
      setLoading(true);

      // Parse CSV
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data.length) throw new Error("CSV file appears empty.");

      // Insert metadata
      const { data: meta, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert([
          {
            country_iso: countryIso,
            indicator_id: selectedIndicator?.id || null,
            title: title || selectedIndicator?.name || "Unnamed Dataset",
            description,
            admin_level: adminLevel,
            upload_type: uploadType,
            data_type: dataType,
            source: JSON.stringify({
              name: sourceName || null,
              url: sourceUrl || null,
            }),
          },
        ])
        .select("id")
        .single();

      if (metaErr || !meta?.id)
        throw new Error(metaErr?.message || "Failed to insert metadata.");

      const datasetId = meta.id;

      // Transform CSV rows
      const rows = (parsed.data as any[])
        .filter((r) => r.pcode && r.value)
        .map((r) => ({
          dataset_id: datasetId,
          admin_pcode: r.pcode.trim(),
          value: parseFloat(r.value),
          unit: r.unit || null,
          notes: r.notes || null,
        }));

      if (!rows.length)
        throw new Error("No valid rows found in CSV (missing pcode/value).");

      // Batch insert values
      const { error: valErr } = await supabase.from("dataset_values").insert(rows);
      if (valErr) throw new Error(valErr.message);

      alert(`✅ Uploaded ${rows.length} records successfully!`);
      onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error("Upload failed:", err.message);
      alert(`❌ Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-red)]">
            Add New Dataset
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicator Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Link to Indicator (optional)
          </label>
          <div className="flex items-center border rounded px-2 py-1">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto mt-2 border rounded">
            {filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  selectedIndicator?.id === ind.id
                    ? "bg-[color:var(--gsc-blue)] text-white"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedIndicator(ind)}
              >
                <div className="font-medium">{ind.name}</div>
                <div className="text-xs text-gray-500">
                  {ind.theme} • {ind.data_type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Config */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Upload Type</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Level</label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              {adminLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data Type</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="numeric">Numeric</option>
              <option value="percentage">Percentage</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source (optional)</label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Source Name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
              <input
                type="url"
                placeholder="URL"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* CSV File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Expected columns: <strong>pcode, value</strong> (optional: unit, notes)
          </p>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-1.5 text-sm text-white rounded hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            {loading ? "Uploading..." : (
              <>
                <Upload className="w-4 h-4 inline mr-1" /> Upload Dataset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
