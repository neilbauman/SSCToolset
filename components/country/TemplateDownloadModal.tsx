"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Download, X, Search } from "lucide-react";

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
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [datasetType, setDatasetType] = useState("gradient");
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [prepopulate, setPrepopulate] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch indicators and admin levels
  useEffect(() => {
    if (open) {
      loadIndicators();
      loadAdminLevels();
    }
  }, [open]);

  const loadIndicators = async () => {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, theme, data_type, default_admin_level")
      .order("theme", { ascending: true })
      .order("name", { ascending: true });

    if (error) console.error("Error loading indicators:", error);
    else {
      setIndicators(data || []);
      setFilteredIndicators(data || []);
    }
  };

  const loadAdminLevels = async () => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("admin_level")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching admin levels:", error);
      setAdminLevels(["ADM0", "ADM1", "ADM2", "ADM3"]);
      return;
    }

    const distinctLevels = Array.from(
      new Set(data.map((r) => r.admin_level))
    ).sort();
    setAdminLevels(
      distinctLevels.length ? distinctLevels : ["ADM0", "ADM1", "ADM2", "ADM3"]
    );
  };

  const handleSearch = (term: string) => {
    setSearch(term);
    if (!term) {
      setFilteredIndicators(indicators);
      return;
    }
    const t = term.toLowerCase();
    const filtered = indicators.filter(
      (i) =>
        i.name.toLowerCase().includes(t) ||
        i.code.toLowerCase().includes(t) ||
        i.theme.toLowerCase().includes(t)
    );
    setFilteredIndicators(filtered);
  };

  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      let rows: any[] = [];
      let headers = ["pcode", "value", "name(optional)"];

      if (prepopulate) {
        const { data, error } = await supabase
          .from("admin_units")
          .select("pcode, name")
          .eq("country_iso", countryIso)
          .eq("admin_level", adminLevel);

        if (error) throw error;

        rows = (data || []).map((r) => ({
          pcode: r.pcode,
          value: "",
          name: r.name,
        }));
      }

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => `${r.pcode},${r.value},${r.name ?? ""}`),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const indicatorLabel = selectedIndicator
        ? selectedIndicator.code
        : "dataset";
      link.href = url;
      link.download = `${indicatorLabel}_${adminLevel}_template.csv`;
      link.click();
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
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-lg relative">
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

        {/* Indicator search */}
        <label className="block text-sm font-medium mb-1">Select Indicator</label>
        <div className="flex items-center border rounded mb-2 px-2 py-1 bg-gray-50">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search indicator..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

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
          <option value="">— None / Create New —</option>
          {filteredIndicators.map((i) => (
            <option key={i.id} value={i.id}>
              {i.theme} – {i.name}
            </option>
          ))}
        </select>

        {/* Dataset type */}
        <label className="block text-sm font-medium mb-1">
          Dataset Type
        </label>
        <select
          className="w-full border rounded px-2 py-1 text-sm mb-3"
          value={datasetType}
          onChange={(e) => setDatasetType(e.target.value)}
        >
          <option value="gradient">Gradient (per admin unit)</option>
          <option value="categorical">Categorical (multi-value per admin)</option>
        </select>

        {/* Admin level */}
        <label className="block text-sm font-medium mb-1">
          Administrative Level
        </label>
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
