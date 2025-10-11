"use client";
import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
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
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    theme: "",
    dataType: "",
    adminLevel: "",
  });
  const [type, setType] = useState("gradient");
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [prefill, setPrefill] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadIndicators();
  }, [open]);

  const loadIndicators = async () => {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, theme, data_type, default_admin_level")
      .order("theme", { ascending: true });
    if (error) console.error("Error loading indicators:", error);
    setIndicators(data || []);
    setFiltered(data || []);
  };

  useEffect(() => {
    const lower = search.toLowerCase();
    const f = indicators.filter(
      (i) =>
        (!filters.theme || i.theme === filters.theme) &&
        (!filters.dataType || i.data_type === filters.dataType) &&
        (!filters.adminLevel || i.default_admin_level === filters.adminLevel) &&
        (i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower))
    );
    setFiltered(f);
  }, [search, filters, indicators]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_iso: countryIso,
          indicator_id: selectedIndicator?.id || null,
          type,
          admin_level: adminLevel,
          prefill,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate template");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const indicatorPart = selectedIndicator ? selectedIndicator.code : "custom";
      a.download = `${countryIso}_${indicatorPart}_${type}_${adminLevel}_template_${prefill ? "prefilled" : "empty"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download template");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-2">Download Dataset Template</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose an indicator (optional), dataset type, and admin level for your CSV template.
        </p>

        {/* Filters + Search */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search indicators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <Search className="w-4 h-4 text-gray-500 absolute right-3 top-3" />
        </div>

        <div className="flex gap-2 mb-3 text-sm">
          <select
            className="border rounded px-2 py-1 flex-1"
            value={filters.theme}
            onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
          >
            <option value="">All Themes</option>
            {[...new Set(indicators.map((i) => i.theme))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 flex-1"
            value={filters.dataType}
            onChange={(e) => setFilters({ ...filters, dataType: e.target.value })}
          >
            <option value="">All Data Types</option>
            {[...new Set(indicators.map((i) => i.data_type))].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 flex-1"
            value={filters.adminLevel}
            onChange={(e) => setFilters({ ...filters, adminLevel: e.target.value })}
          >
            <option value="">All Levels</option>
            {[...new Set(indicators.map((i) => i.default_admin_level))].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Indicator list */}
        <div className="max-h-40 overflow-y-auto border rounded mb-4">
          {filtered.length ? (
            filtered.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedIndicator(i)}
                className={`w-full text-left px-3 py-1 text-sm border-b hover:bg-gray-50 ${
                  selectedIndicator?.id === i.id ? "bg-green-50 font-semibold" : ""
                }`}
              >
                {i.name} <span className="text-gray-500 text-xs">({i.code})</span>
              </button>
            ))
          ) : (
            <p className="text-sm italic text-gray-500 p-3">No indicators found.</p>
          )}
        </div>

        {/* Dataset settings */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div>
            <label className="block font-medium mb-1">Dataset Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border rounded w-full px-2 py-1"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Admin Level</label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="border rounded w-full px-2 py-1"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Prefill Mode</label>
            <select
              value={prefill ? "true" : "false"}
              onChange={(e) => setPrefill(e.target.value === "true")}
              className="border rounded w-full px-2 py-1"
            >
              <option value="false">Empty</option>
              <option value="true">Prefilled (with PCodes/Names)</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setSelectedIndicator(null)}
            className="text-sm text-blue-700 hover:underline"
          >
            Skip indicator selection
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded text-sm">
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="px-3 py-1 bg-[color:var(--gsc-green)] text-white rounded text-sm"
            >
              {loading ? "Generating..." : "Download Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
