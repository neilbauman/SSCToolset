"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, Loader2, AlertCircle, Search } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  theme: string;
  data_type: string;
  default_admin_level: string;
  unit: string;
};

interface AddDatasetModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function AddDatasetModal({ open, onClose, countryIso, onUploaded }: AddDatasetModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTheme, setFilterTheme] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualValue, setManualValue] = useState<string>("");
  const [metadata, setMetadata] = useState({ title: "", source: "", notes: "" });
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load indicator catalogue
  useEffect(() => {
    if (!open) return;
    const loadIndicators = async () => {
      const { data, error } = await supabase.from("indicator_catalogue").select("*").order("theme");
      if (error) console.error("Failed to load indicators:", error);
      else {
        setIndicators(data || []);
        setFilteredIndicators(data || []);
      }
    };
    loadIndicators();
  }, [open]);

  // Filtering logic
  useEffect(() => {
    let filtered = indicators;
    if (filterType !== "all") filtered = filtered.filter((i) => i.type === filterType);
    if (filterTheme !== "all") filtered = filtered.filter((i) => i.theme === filterTheme);
    if (search)
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.code.toLowerCase().includes(search.toLowerCase())
      );
    setFilteredIndicators(filtered);
  }, [filterType, filterTheme, search, indicators]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setCsvFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedIndicator) return alert("Select an indicator first.");

    setLoading(true);
    setProgressMsg("Parsing CSV...");
    const parsed: any[] = [];

    if (csvFile) {
      await new Promise<void>((resolve, reject) => {
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            parsed.push(...res.data);
            resolve();
          },
          error: (err) => reject(err),
        });
      });
    }

    const indicatorId = selectedIndicator.id;
    const indicatorType = selectedIndicator.type;
    const dataType = selectedIndicator.data_type;
    const adminLevel = selectedIndicator.default_admin_level;

    setProgressMsg("Saving dataset metadata...");

    const { data: dataset, error: metaErr } = await supabase
      .from("dataset_metadata")
      .insert({
        country_iso: countryIso,
        indicator_id: indicatorId,
        title: metadata.title || selectedIndicator.name,
        description: metadata.notes,
        source: metadata.source,
        admin_level: adminLevel,
        upload_type: csvFile ? "csv" : "manual",
        theme: selectedIndicator.theme,
      })
      .select()
      .single();

    if (metaErr || !dataset) {
      setLoading(false);
      return alert("Error saving metadata: " + metaErr?.message);
    }

    // If manual numeric entry (statistic)
    if (!csvFile && indicatorType === "statistic" && manualValue) {
      const numVal = parseFloat(manualValue);
      if (isNaN(numVal)) {
        alert("Invalid value");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("indicator_results").insert([
        {
          indicator_id: indicatorId,
          dataset_version_id: dataset.id,
          admin_pcode: "ADM0",
          value: dataType === "percentage" ? numVal / 100 : numVal,
        },
      ]);
      if (error) alert("Failed to insert value: " + error.message);
      setLoading(false);
      setProgressMsg("");
      onUploaded();
      onClose();
      return;
    }

    // CSV upload (gradient or others)
    if (parsed.length > 0) {
      const chunkSize = 1000;
      let chunkCount = Math.ceil(parsed.length / chunkSize);

      for (let i = 0; i < parsed.length; i += chunkSize) {
        const chunk = parsed.slice(i, i + chunkSize);
        const insertData = chunk.map((row) => ({
          indicator_id: indicatorId,
          dataset_version_id: dataset.id,
          admin_pcode: row.pcode || row.PCODE || row.admin_pcode || "N/A",
          value:
            dataType === "percentage"
              ? parseFloat(row.value) / 100
              : parseFloat(row.value),
        }));
        setProgressMsg(`Uploading chunk ${Math.floor(i / chunkSize) + 1} of ${chunkCount}...`);
        const { error } = await supabase.from("indicator_results").insert(insertData);
        if (error) console.error("Chunk upload failed:", error.message);
        setUploadProgress(Math.min(100, ((i + chunkSize) / parsed.length) * 100));
      }
    }

    setLoading(false);
    setProgressMsg("");
    setUploadProgress(100);
    onUploaded();
    onClose();
  };

  const resetModal = () => {
    setStep(1);
    setCsvFile(null);
    setManualValue("");
    setMetadata({ title: "", source: "", notes: "" });
    setSelectedIndicator(null);
    setProgressMsg("");
    setUploadProgress(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <button onClick={() => { onClose(); resetModal(); }} className="absolute right-4 top-4 text-gray-500 hover:text-black">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Add Dataset
        </h2>

        {step === 1 && (
          <div>
            <h3 className="font-semibold mb-2">1️⃣ Select Indicator</h3>
            <div className="flex gap-2 mb-3">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All Types</option>
                <option value="statistic">Statistic</option>
                <option value="gradient">Gradient</option>
                <option value="categorical">Categorical</option>
              </select>
              <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All Themes</option>
                {[...new Set(indicators.map((i) => i.theme))].map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
              <div className="flex items-center border rounded px-2 py-1 flex-1">
                <Search className="w-4 h-4 text-gray-400 mr-1" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full text-sm outline-none"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded">
              {filteredIndicators.map((ind) => (
                <div
                  key={ind.id}
                  onClick={() => setSelectedIndicator(ind)}
                  className={`px-3 py-2 text-sm cursor-pointer border-b hover:bg-blue-50 ${
                    selectedIndicator?.id === ind.id ? "bg-blue-100 font-semibold" : ""
                  }`}
                >
                  <div>{ind.name}</div>
                  <div className="text-xs text-gray-500">{ind.theme} • {ind.type}</div>
                </div>
              ))}
              {filteredIndicators.length === 0 && (
                <p className="text-sm text-gray-500 p-3">No indicators match filters.</p>
              )}
            </div>

            {selectedIndicator && (
              <div className="mt-3 flex justify-between">
                <div className="text-sm text-gray-600">
                  Selected: <strong>{selectedIndicator.name}</strong> ({selectedIndicator.data_type})
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:opacity-90"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedIndicator && (
          <div>
            <h3 className="font-semibold mb-2">2️⃣ Upload Data</h3>
            {selectedIndicator.type === "statistic" ? (
              <div className="mb-4">
                <label className="block text-sm mb-1">
                  Enter Value ({selectedIndicator.data_type === "percentage" ? "%" : selectedIndicator.unit})
                </label>
                <input
                  type="number"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  className="border rounded w-full px-2 py-1"
                />
                <p className="text-xs text-gray-500 mt-1">Or upload a CSV file with a 'value' column.</p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm mb-1">Upload CSV file</label>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
                <p className="text-xs text-gray-500 mt-1">CSV must include columns: pcode, value.</p>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-3 py-1 border rounded text-sm">← Back</button>
              <button onClick={() => setStep(3)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:opacity-90">Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="font-semibold mb-2">3️⃣ Dataset Metadata</h3>
            <label className="block text-sm mb-1">Title</label>
            <input type="text" value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} className="border rounded w-full px-2 py-1 mb-2" />
            <label className="block text-sm mb-1">Source</label>
            <input type="text" value={metadata.source} onChange={(e) => setMetadata({ ...metadata, source: e.target.value })} className="border rounded w-full px-2 py-1 mb-2" />
            <label className="block text-sm mb-1">Notes</label>
            <textarea value={metadata.notes} onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })} className="border rounded w-full px-2 py-1 mb-2" rows={2}></textarea>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-3 py-1 border rounded text-sm">← Back</button>
              <button onClick={handleUpload} disabled={loading} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:opacity-90 flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />} Upload
              </button>
            </div>
          </div>
        )}

        {progressMsg && (
          <div className="mt-4 text-sm text-gray-700 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {progressMsg}
          </div>
        )}
      </div>
    </div>
  );
}
