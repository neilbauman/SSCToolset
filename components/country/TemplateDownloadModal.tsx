"use client";

import { useEffect, useState } from "react";
import { X, Info } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface TemplateDownloadModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}

export default function TemplateDownloadModal({
  open,
  onClose,
  countryIso,
}: TemplateDownloadModalProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [selectedIndicator, setSelectedIndicator] = useState<string>("");
  const [indicatorType, setIndicatorType] = useState<"gradient" | "categorical">("gradient");
  const [adminLevel, setAdminLevel] = useState<string>("ADM1");
  const [prefill, setPrefill] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Load indicators and themes
  useEffect(() => {
    if (!open) return;
    const loadIndicators = async () => {
      const { data, error } = await supabase.from("indicator_catalogue").select("*");
      if (!error && data) {
        setIndicators(data);
        const uniqueThemes = [...new Set(data.map((i) => i.theme).filter(Boolean))];
        setThemes(uniqueThemes);
      }
    };
    loadIndicators();
  }, [open]);

  // Filter indicators by theme
  useEffect(() => {
    if (selectedTheme) {
      setFilteredIndicators(indicators.filter((i) => i.theme === selectedTheme));
    } else {
      setFilteredIndicators(indicators);
    }
  }, [selectedTheme, indicators]);

  // Native CSV download helper
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle template generation
  const handleDownload = async () => {
    setLoading(true);

    let rows: any[] = [];
    let filename = "TEMPLATE.csv";

    if (selectedIndicator) {
      const indicator = indicators.find((i) => i.id === selectedIndicator);
      filename = `${indicator?.code || "INDICATOR"}_${adminLevel}_TEMPLATE.csv`;
    } else {
      filename = `${indicatorType.toUpperCase()}_${adminLevel}_TEMPLATE.csv`;
    }

    if (prefill) {
      const { data: placesDataset } = await supabase
        .from("places_datasets")
        .select("dataset_version_id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .maybeSingle();

      if (placesDataset?.dataset_version_id) {
        const { data: places } = await supabase
          .from("places")
          .select("pcode, name, level")
          .eq("country_iso", countryIso)
          .eq("level", adminLevel)
          .eq("dataset_version_id", placesDataset.dataset_version_id);

        if (places?.length) {
          rows = places.map((p) => ({
            pcode: p.pcode,
            value: "",
            name: p.name || "",
          }));
        }
      }
    }

    if (rows.length === 0) rows = [{ pcode: "", value: "", name: "" }];

    const csv = Papa.unparse(rows);
    downloadCSV(csv, filename);
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Download Dataset Template
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Theme Filter */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Theme
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">All Themes</option>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator Selection */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Indicator
          </label>
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">New Indicator (Custom)</option>
            {filteredIndicators.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator Type */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indicator Type
          </label>
          <select
            value={indicatorType}
            onChange={(e) =>
              setIndicatorType(e.target.value as "gradient" | "categorical")
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="gradient">Gradient</option>
            <option value="categorical">Categorical</option>
          </select>
        </div>

        {/* Admin Level */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Administrative Level
          </label>
          <select
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="ADM0">ADM0</option>
            <option value="ADM1">ADM1</option>
            <option value="ADM2">ADM2</option>
            <option value="ADM3">ADM3</option>
            <option value="ADM4">ADM4</option>
          </select>
        </div>

        {/* Prefill Toggle */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={prefill}
              onChange={(e) => setPrefill(e.target.checked)}
              className="h-4 w-4 accent-red-500"
            />
            <span className="flex items-center gap-1">
              Prefill with admin boundaries
              <Info
                className="w-4 h-4 text-gray-400"
                title="Prefill uses the currently active administrative boundary dataset for this country."
              />
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#C21F3A] text-white font-medium hover:bg-[#a41b32] transition disabled:opacity-50"
          >
            {loading ? "Generating..." : "Download Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
