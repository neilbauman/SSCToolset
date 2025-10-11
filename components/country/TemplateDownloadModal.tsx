"use client";

import { useState, useEffect } from "react";
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
  const [templateType, setTemplateType] = useState<"gradient" | "categorical">("gradient");
  const [prefill, setPrefill] = useState(false);
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [selectedAdminLevel, setSelectedAdminLevel] = useState<string>("");
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available admin levels
  useEffect(() => {
    if (!open) return;
    const fetchAdminLevels = async () => {
      const { data, error } = await supabase
        .from("admin_names")
        .select("level")
        .eq("country_iso", countryIso);

      if (!error && data) {
        const levels = Array.from(new Set(data.map((d) => d.level))).sort((a, b) => a - b);
        setAdminLevels(levels.map((l) => `ADM${l}`));
      }
    };
    fetchAdminLevels();
  }, [open, countryIso]);

  // Update category name inputs when count changes
  useEffect(() => {
    if (templateType === "categorical") {
      setCategories(Array.from({ length: categoryCount }, (_, i) => categories[i] || ""));
    } else {
      setCategories([]);
    }
  }, [categoryCount, templateType]);

  const handleCategoryChange = (index: number, value: string) => {
    const updated = [...categories];
    updated[index] = value;
    setCategories(updated);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    setLoading(true);
    let rows: any[] = [];

    // If prefill is on, get places from active dataset
    if (prefill && selectedAdminLevel) {
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
          .eq("level", selectedAdminLevel)
          .eq("dataset_version_id", placesDataset.dataset_version_id);

        if (places?.length) {
          rows = Array.from(new Map(places.map((p) => [p.pcode, p])).values()).map((p) => ({
            pcode: p.pcode,
            value: "",
            name: p.name || "",
          }));
        }
      }
    }

    // Fallback empty row if no prefill
    if (rows.length === 0) rows = [{ pcode: "", value: "", name: "" }];

    // Add category header if categorical
    let headers = ["pcode", "value", "name"];
    if (templateType === "categorical" && categories.length > 0) {
      headers = ["pcode", "category", "name"];
    }

    const csv = Papa.unparse(rows, { columns: headers });

    const filename = `${
      templateType === "gradient" ? "GRADIENT" : "CATEGORICAL"
    }_${selectedAdminLevel || "TEMPLATE"}.csv`;

    downloadCSV(csv, filename);
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Download Template</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Type</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as "gradient" | "categorical")}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#C21F3A] focus:border-[#C21F3A]"
          >
            <option value="gradient">Gradient</option>
            <option value="categorical">Categorical</option>
          </select>
        </div>

        {/* Prefill Toggle */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={prefill}
              onChange={(e) => setPrefill(e.target.checked)}
              className="h-4 w-4 accent-[#C21F3A]"
            />
            <span className="flex items-center gap-1">
              Prefill with admin boundaries
              <span
                title="Uses the currently active administrative boundary dataset for this country."
                className="inline-flex items-center"
              >
                <Info className="w-4 h-4 text-gray-400" />
              </span>
            </span>
          </label>
        </div>

        {/* Admin Level Selection (only if prefill) */}
        {prefill && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Administrative Level
            </label>
            <select
              value={selectedAdminLevel}
              onChange={(e) => setSelectedAdminLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#C21F3A] focus:border-[#C21F3A]"
            >
              <option value="">Select Admin Level</option>
              {adminLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Categorical Options */}
        {templateType === "categorical" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Categories
            </label>
            <input
              type="number"
              min="1"
              value={categoryCount}
              onChange={(e) => setCategoryCount(parseInt(e.target.value) || 0)}
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-[#C21F3A]"
            />
            {categoryCount > 0 && (
              <div className="mt-3 space-y-2">
                {categories.map((cat, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Category ${i + 1} name`}
                    value={cat}
                    onChange={(e) => handleCategoryChange(i, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#C21F3A]"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="px-4 py-2 bg-[#C21F3A] text-white rounded-md font-medium hover:bg-[#a41b32] transition disabled:opacity-50"
          >
            {loading ? "Generating..." : "Download Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
