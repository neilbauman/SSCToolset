"use client";

import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Download, X, Search, Filter } from "lucide-react";

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
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);

  const [filters, setFilters] = useState({
    theme: "",
    type: "",
    data_type: "",
    search: "",
  });

  const [datasetType, setDatasetType] = useState("gradient");
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [prepopulate, setPrepopulate] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadIndicators();
      loadThemes();
      loadAdminLevels();
    }
  }, [open]);

  const loadIndicators = async () => {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, theme, data_type, default_admin_level")
      .order("theme", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading indicators:", error);
      return;
    }
    setIndicators(data || []);
  };

  const loadThemes = async () => {
    const { data, error } = await supabase
      .from("theme_catalogue")
      .select("name")
      .order("name", { ascending: true });
    if (error) {
      console.error("Error loading themes:", error);
      return;
    }
    setThemes((data || []).map((t) => t.name));
  };

  const loadAdminLevels = async () => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("level")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching admin levels:", error);
      setAdminLevels(["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"]);
      return;
    }

    const levels = Array.from(
      new Set(
        (data || []).map((r) =>
          typeof r.level === "number"
            ? `ADM${r.level}`
            : String(r.level).toUpperCase()
        )
      )
    ).sort((a, b) => parseInt(a.replace("ADM", "")) - parseInt(b.replace("ADM", "")));

    setAdminLevels(levels.length ? levels : ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"]);
  };

  const filteredIndicators = useMemo(() => {
    return indicators.filter((i) => {
      const matchesTheme = !filters.theme || i.theme === filters.theme;
      const matchesType = !filters.type || i.type === filters.type;
      const matchesDataType = !filters.data_type || i.data_type === filters.data_type;
      const matchesSearch =
        !filters.search ||
        i.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        i.code.toLowerCase().includes(filters.search.toLowerCase());
      return matchesTheme && matchesType && matchesDataType && matchesSearch;
    });
  }, [indicators, filters]);

  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      const headers = ["pcode", "value", "name(optional)"];
      let rows: any[] = [];

      if (prepopulate) {
        const { data, error } = await supabase
          .from("admin_units")
          .select("pcode, name, level")
          .eq("country_iso", countryIso)
          .eq("level", adminLevel.replace("ADM", ""));

        if (error) throw error;
        rows = (data || []).map((r) => ({
          pcode: r.pcode,
          value: "",
          name: r.name,
        }));
      }

      const csv = [
        headers.join(","),
        ...rows.map((r) => `${r.pcode},${r.value},${r.name ?? ""}`),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const indicatorLabel = selectedIndicator
        ? selectedIndicator.code
        : "dataset";
      a.href = url;
      a.download = `${indicatorLabel}_${adminLevel}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Template generation failed:", e);
      alert("Failed to generate template. Check console for details.");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-green-600" />
          Download Dataset Template
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-sm">
          <select
            value={filters.theme}
            onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
            className="border rounded px-2 py-1"
          >
            <option value="">All Themes</option>
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="border rounded px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="gradient">Gradient</option>
            <option value="categorical">Categorical</option>
            <option value="disaggregated">Disaggregated</option>
            <option value="derived">Derived</option>
          </select>

          <select
            value={filters.data_type}
            onChange={(e) =>
              setFilters({ ...filters, data_type: e.target.value })
            }
            className="border rounded px-2 py-1"
          >
            <option value="">All Data Types</option>
            <option value="numeric">Numeric</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center border rounded mb-2 px-2 py-1 bg-gray-50">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search indicators..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* Indicator selection */}
        <label className="block text-sm font-medium mb-1">Indicator</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm mb-3"
          value={selectedIndicator?.id || ""}
          onChange={(e) => {
            const found = indicators.find((i) => i.id === e.target.value);
            setSelectedIndicator(found || null);
            if (found?.default_admin_level)
              setAdminLevel(found.default_admin_level);
          }}
        >
          <option value="">— New Indicator —</option>
          {filteredIndicators.map((i) => (
            <option key={i.id} value={i.id}>
              {i.theme} – {i.name} ({i.code})
            </option>
          ))}
        </select>

        {/* Dataset type */}
        <label className="block text-sm font-medium mb-1">Dataset Type</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm mb-3"
          value={datasetType}
          onChange={(e) => setDatasetType(e.target.value)}
        >
          <option value="gradient">Gradient (values per admin unit)</option>
          <option value="categorical">Categorical (grouped by attribute)</option>
        </select>

        {/* Admin level */}
        <label className="block text-sm font-medium mb-1">Admin Level</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm mb-3"
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
        >
          {adminLevels.map((lvl) => (
            <option key={lvl}>{lvl}</option>
          ))}
        </select>

        {/* Prefill toggle */}
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            checked={prepopulate}
            onChange={(e) => setPrepopulate(e.target.checked)}
          />
          Pre-fill with PCodes and Names from {adminLevel}
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateTemplate}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
