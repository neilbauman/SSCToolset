"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Download, Loader2, Search, Plus } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface TemplateDownloadModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}

export default function TemplateDownloadModal({ open, onClose, countryIso }: TemplateDownloadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [indicators, setIndicators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [themes, setThemes] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [dataTypes, setDataTypes] = useState<string[]>([]);

  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDataType, setSelectedDataType] = useState<string>("");

  const [selectedIndicator, setSelectedIndicator] = useState<any | null>(null);
  const [datasetType, setDatasetType] = useState<"gradient" | "categorical">("gradient");
  const [adminLevel, setAdminLevel] = useState<string>("ADM2");
  const [prefill, setPrefill] = useState<boolean>(true);

  useEffect(() => {
    const fetchCatalogue = async () => {
      const { data, error } = await supabase
        .from("indicator_catalogue")
        .select("id, name, code, theme, type, data_type, description");
      if (error) {
        setError(error.message);
        return;
      }
      setIndicators(data || []);
      setThemes([...new Set(data.map((i) => i.theme).filter(Boolean))]);
      setTypes([...new Set(data.map((i) => i.type).filter(Boolean))]);
      setDataTypes([...new Set(data.map((i) => i.data_type).filter(Boolean))]);
    };
    if (open) fetchCatalogue();
  }, [open]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter((i) => {
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTheme = selectedTheme ? i.theme === selectedTheme : true;
      const matchType = selectedType ? i.type === selectedType : true;
      const matchDataType = selectedDataType ? i.data_type === selectedDataType : true;
      return matchSearch && matchTheme && matchType && matchDataType;
    });
  }, [indicators, searchTerm, selectedTheme, selectedType, selectedDataType]);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      let rows: any[] = [];

      if (prefill) {
        const { data, error } = await supabase
          .from("admin_units")
          .select("pcode, name")
          .eq("country_iso", countryIso)
          .eq("level", adminLevel);

        if (error) throw error;

        rows = (data || []).map((r) => ({ pcode: r.pcode, name: r.name, value: "" }));
      }

      const csv = Papa.unparse(rows.length > 0 ? rows : [{ pcode: "", name: "", value: "" }]);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedIndicator?.code || "new_dataset"}_${adminLevel}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Download Dataset Template</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <div className="mb-4 border-b pb-3">
          <h3 className="font-semibold text-gray-700 mb-2">Select from Indicator Library</h3>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search indicators by name or code..."
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <select className="border rounded px-2 py-1 text-sm" value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
              <option value="">All Themes</option>
              {themes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={selectedDataType} onChange={(e) => setSelectedDataType(e.target.value)}>
              <option value="">All Data Types</option>
              {dataTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="border rounded h-32 overflow-y-auto text-sm">
            {filteredIndicators.length ? (
              filteredIndicators.map((i) => (
                <div
                  key={i.id}
                  className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedIndicator?.id === i.id ? "bg-blue-50 border-l-4 border-[color:var(--gsc-red)]" : ""}`}
                  onClick={() => setSelectedIndicator(i)}
                >
                  <p className="font-medium text-gray-800">{i.name}</p>
                  <p className="text-gray-500 text-xs">{i.theme} • {i.type} • {i.data_type}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic p-2">No indicators found.</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Indicator Options</h3>
          <button
            className="flex items-center gap-2 text-sm text-[color:var(--gsc-red)] hover:underline mb-2"
            onClick={() => setSelectedIndicator({ id: null, name: "New Indicator" })}
          >
            <Plus className="w-4 h-4" /> Create New Indicator
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Template Configuration</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Dataset Type</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={datasetType} onChange={(e) => setDatasetType(e.target.value as any)}>
                <option value="gradient">Gradient</option>
                <option value="categorical">Categorical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Admin Level</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                {[0, 1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={`ADM${lvl}`}>{`ADM${lvl}`}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={prefill} onChange={(e) => setPrefill(e.target.checked)} />
              <span className="text-sm text-gray-700">Prefill with PCodes and Names</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="px-3 py-1 bg-[color:var(--gsc-red)] text-white rounded text-sm hover:opacity-90 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? "Generating..." : "Download Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
