"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface AddDatasetModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void>;
}

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState("All");
  const [selected, setSelected] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [dataType, setDataType] = useState("numeric");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchIndicators();
  }, [open]);

  async function fetchIndicators() {
    const { data } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, theme, type, data_type")
      .order("theme");
    if (data) setIndicators(data);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    if (!selected) {
      alert("Please select an indicator or create a new one.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("dataset_metadata").insert([
      {
        country_iso: countryIso,
        indicator_id: selected.id,
        title: title.trim(),
        description: description || null,
        source: JSON.stringify({
          name: sourceName || null,
          url: sourceUrl || null,
        }),
        admin_level: adminLevel,
        data_type: dataType,
        upload_type: selected.type,
      },
    ]);

    setLoading(false);
    if (error) {
      console.error(error);
      alert("Failed to save dataset metadata.");
    } else {
      await onUploaded();
      onClose();
    }
  }

  const filteredIndicators = indicators.filter((i) => {
    const matchTheme = themeFilter === "All" || i.theme === themeFilter;
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase());
    return matchTheme && matchSearch;
  });

  if (!open) return null;

  const themes = Array.from(new Set(indicators.map((i) => i.theme))).sort();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Add New Dataset
        </h2>

        {/* Indicator Search */}
        <div className="flex gap-2 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator List */}
        <div className="border rounded-lg overflow-y-auto max-h-40 mb-4">
          {filteredIndicators.map((i) => (
            <div
              key={i.id}
              onClick={() => setSelected(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                selected?.id === i.id
                  ? "bg-green-50 border-l-4 border-[var(--gsc-green)]"
                  : "hover:bg-gray-50"
              }`}
            >
              <strong>{i.name}</strong> ({i.code}) –{" "}
              <span className="text-gray-600 text-xs">{i.theme}</span>
            </div>
          ))}
        </div>

        {/* Indicator Details */}
        {selected && (
          <div className="bg-gray-50 border rounded-lg p-3 text-sm mb-4">
            <p className="font-semibold text-[color:var(--gsc-red)] mb-1">
              {selected.name}
            </p>
            <p>Theme: {selected.theme}</p>
            <p>Type: {selected.type}</p>
            <p>Default Data Type: {selected.data_type}</p>
          </div>
        )}

        {/* Admin level + Data type */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Administrative Level
            </label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
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
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="numeric">Numeric</option>
              <option value="percentage">Percentage</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>
        </div>

        {/* Title, Description, Source */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-[var(--gsc-red)]">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Source Name
              </label>
              <input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Source URL
              </label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded text-sm text-white"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            {loading ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
