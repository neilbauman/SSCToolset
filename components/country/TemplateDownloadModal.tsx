"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Download, X } from "lucide-react";

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
  const [types, setTypes] = useState<string[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("All Themes");
  const [selectedType, setSelectedType] = useState("All Types");
  const [adminLevels, setAdminLevels] = useState<string[]>([]);
  const [adminLevel, setAdminLevel] = useState<string>("");
  const [prefillMode, setPrefillMode] = useState<"Empty" | "Prefilled">("Empty");
  const [datasetType, setDatasetType] = useState("gradient");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadIndicators();
      loadAdminLevels();
    }
  }, [open]);

  const loadIndicators = async () => {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("*")
      .order("theme", { ascending: true });

    if (error) {
      console.error("Error fetching indicators:", error);
      return;
    }

    setIndicators(data || []);
    const uniqueThemes = Array.from(new Set(data.map((d) => d.theme))).filter(Boolean);
    const uniqueTypes = Array.from(new Set(data.map((d) => d.data_type))).filter(Boolean);

    setThemes(["All Themes", ...uniqueThemes]);
    setTypes(["All Types", ...uniqueTypes]);
  };

  const loadAdminLevels = async () => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("admin_level")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching admin levels:", error);
      setAdminLevels(["ADM0", "ADM1", "ADM2", "ADM3"]);
      setAdminLevel("ADM2");
      return;
    }

    const distinctLevels = Array.from(
      new Set(data.map((r) => r.admin_level))
    ).sort();

    setAdminLevels(distinctLevels.length ? distinctLevels : ["ADM0", "ADM1", "ADM2", "ADM3"]);
    setAdminLevel(distinctLevels[0] || "ADM2");
  };

  const filteredIndicators = indicators.filter((ind) => {
    const matchesTheme =
      selectedTheme === "All Themes" || ind.theme === selectedTheme;
    const matchesType =
      selectedType === "All Types" || ind.data_type === selectedType;
    const matchesSearch =
      search === "" ||
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.code.toLowerCase().includes(search.toLowerCase());
    return matchesTheme && matchesType && matchesSearch;
  });

  const handleDownload = async () => {
    setLoading(true);
    try {
      const body = {
        country_iso: countryIso,
        indicator_id: selectedIndicator?.id || null,
        type: datasetType,
        admin_level: adminLevel,
        prefill: prefillMode === "Prefilled",
      };

      const res = await fetch("/functions/v1/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        alert(`Failed to generate template (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${countryIso}_${datasetType}_${adminLevel}_template.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("Template download failed:", err);
      alert("Failed to download template.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4">Download Dataset Template</h2>

        <p className="text-gray-600 mb-4">
          Choose an indicator (optional), dataset type, and admin level for your CSV template.
        </p>

        {/* Indicator selection */}
        <input
          type="text"
          placeholder="Search indicators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded w-full px-2 py-1 mb-2"
        />

        <div className="flex gap-2 mb-2">
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          >
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          >
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="border rounded mb-4 max-h-32 overflow-y-auto">
          {filteredIndicators.length === 0 ? (
            <div className="text-gray-500 p-2 text-sm">No indicators found</div>
          ) : (
            filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                onClick={() => setSelectedIndicator(ind)}
                className={`p-2 cursor-pointer ${
                  selectedIndicator?.id === ind.id
                    ? "bg-green-100"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="font-medium">{ind.name}</span>{" "}
                <span className="text-gray-500 text-sm">
                  ({ind.code})
                </span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => setSelectedIndicator(null)}
          className="text-blue-600 text-sm mb-4 hover:underline"
        >
          Skip indicator selection
        </button>

        {/* Dataset type and admin level */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Dataset Type</label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value)}
              className="border rounded w-full px-2 py-1"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Admin Level</label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="border rounded w-full px-2 py-1"
            >
              {adminLevels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Prefill Mode</label>
            <select
              value={prefillMode}
              onChange={(e) => setPrefillMode(e.target.value as "Empty" | "Prefilled")}
              className="border rounded w-full px-2 py-1"
            >
              <option value="Empty">Empty</option>
              <option value="Prefilled">Prefilled</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleDownload}
            className="px-4 py-2 bg-green-700 text-white rounded flex items-center gap-2 hover:bg-green-800 disabled:opacity-50"
          >
            <Download size={16} />
            {loading ? "Generating..." : "Download Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
