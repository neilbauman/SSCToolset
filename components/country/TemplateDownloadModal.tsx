"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Info, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

interface TemplateDownloadModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}

export default function TemplateDownloadModal({ open, onClose, countryIso }: TemplateDownloadModalProps) {
  const supabase = createClient();
  const [datasetType, setDatasetType] = useState("gradient");
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [indicators, setIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [themes, setThemes] = useState<string[]>([]);
  const [prefill, setPrefill] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!countryIso) return;
    const fetchLevels = async () => {
      const { data, error } = await supabase
        .from("admin_units")
        .select("level")
        .eq("country_iso", countryIso);
      if (!error && data) {
        const uniqueLevels = [...new Set(data.map((d) => d.level))].sort();
        setAdminLevels(uniqueLevels);
      }
    };
    fetchLevels();
  }, [countryIso]);

  useEffect(() => {
    const fetchIndicators = async () => {
      const { data } = await supabase.from("indicator_catalogue").select("id, code, name, theme, type");
      if (data) {
        setIndicators(data);
        const uniqueThemes = [...new Set(data.map((i) => i.theme).filter(Boolean))];
        setThemes(uniqueThemes);
      }
    };
    fetchIndicators();
  }, []);

  const filteredIndicators = indicators.filter((i) => {
    const matchesTheme = selectedTheme ? i.theme === selectedTheme : true;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchesTheme && matchesSearch;
  });

  const handleGenerateTemplate = async () => {
    if (!selectedAdmin) return alert("Please select an admin level");

    setLoading(true);
    let rows: any[] = [];

    if (prefill) {
      const { data, error } = await supabase
        .from("admin_units")
        .select("pcode, name")
        .eq("country_iso", countryIso)
        .eq("level", selectedAdmin);

      if (error) {
        setLoading(false);
        return alert("Failed to fetch admin boundaries");
      }

      rows = data.map((d) => ({ pcode: d.pcode, name: d.name || "" }));
    }

    let headers: string[] = [];
    if (datasetType === "gradient") headers = ["pcode", "name(optional)", "value"];
    else headers = ["pcode", "name(optional)", "category_a", "category_b", "category_c"];

    if (!prefill) rows = [];

    const csv = Papa.unparse({ fields: headers, data: rows });

    const selectedIndicatorObj = indicators.find((i) => i.id === selectedIndicator);
    const indicatorCode = selectedIndicatorObj ? selectedIndicatorObj.code : datasetType.toUpperCase();

    const filename = `${indicatorCode}_${selectedAdmin}_TEMPLATE.csv`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    setLoading(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Download Dataset Template</h2>

        <label className="block text-sm font-medium text-gray-700">Dataset Type</label>
        <select
          value={datasetType}
          onChange={(e) => setDatasetType(e.target.value)}
          className="w-full border rounded-md p-2 mb-4"
        >
          <option value="gradient">Gradient</option>
          <option value="categorical">Categorical</option>
        </select>

        <label className="block text-sm font-medium text-gray-700">Theme Filter</label>
        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
          className="w-full border rounded-md p-2 mb-4"
        >
          <option value="">All Themes</option>
          {themes.map((theme) => (
            <option key={theme} value={theme}>{theme}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Indicator</label>
        <input
          type="text"
          placeholder="Search indicators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-md p-2 mb-2"
        />
        <select
          value={selectedIndicator}
          onChange={(e) => setSelectedIndicator(e.target.value)}
          className="w-full border rounded-md p-2 mb-4"
        >
          <option value="">Select or leave blank (new indicator)</option>
          {filteredIndicators.map((indicator) => (
            <option key={indicator.id} value={indicator.id}>
              {indicator.name} ({indicator.code})
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Admin Level</label>
        <select
          value={selectedAdmin}
          onChange={(e) => setSelectedAdmin(e.target.value)}
          className="w-full border rounded-md p-2 mb-4"
        >
          <option value="">Select Level</option>
          {adminLevels.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 mb-4 group relative">
          <input
            type="checkbox"
            checked={prefill}
            onChange={(e) => setPrefill(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm text-gray-700 flex items-center gap-1">
            Prefill with admin boundaries
            <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
          </label>
          <div className="absolute left-40 bottom-6 hidden group-hover:block bg-gray-800 text-white text-xs rounded-md px-2 py-1 w-64 shadow-md">
            Prefill uses the <strong>active administrative boundary dataset version</strong> for this country.
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleGenerateTemplate}
            disabled={loading}
            className="px-4 py-2 rounded-md text-white bg-[#7D212E] hover:bg-[#5B171F] flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate Template
          </button>
        </div>
      </div>
    </div>
  );
}
