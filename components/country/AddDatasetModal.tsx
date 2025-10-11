"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

interface AddDatasetModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void; // <-- new prop
}

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sourceName: "",
    sourceUrl: "",
  });

  // Load indicators from catalogue
  useEffect(() => {
    if (!open) return;
    const loadIndicators = async () => {
      const { data } = await supabase.from("indicator_catalogue").select("*").order("theme", { ascending: true });
      setIndicators(data || []);
      setFilteredIndicators(data || []);
      setThemes(["All", ...new Set((data || []).map((i) => i.theme).filter(Boolean))]);
    };
    loadIndicators();
  }, [open]);

  // Filter indicators
  useEffect(() => {
    let filtered = indicators;
    if (selectedTheme !== "All") filtered = filtered.filter((i) => i.theme === selectedTheme);
    if (searchTerm.trim()) filtered = filtered.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredIndicators(filtered);
  }, [selectedTheme, searchTerm, indicators]);

  const handleCreate = async () => {
    if (!selectedIndicator || !form.title.trim()) {
      alert("Please select an indicator and enter a title.");
      return;
    }

    setUploading(true);
    const sourceObj =
      form.sourceName && form.sourceUrl
        ? JSON.stringify({ name: form.sourceName, url: form.sourceUrl })
        : form.sourceName
        ? JSON.stringify({ name: form.sourceName })
        : null;

    const { error } = await supabase.from("dataset_metadata").insert([
      {
        country_iso: countryIso,
        indicator_id: selectedIndicator.id,
        title: form.title.trim(),
        description: form.description || null,
        source: sourceObj,
        admin_level: selectedIndicator.default_admin_level || "ADM0",
        theme: selectedIndicator.theme || null,
        upload_type: "csv",
        join_field: "pcode",
      },
    ]);

    setUploading(false);
    if (error) {
      console.error(error);
      alert("Error creating dataset.");
    } else {
      onUploaded(); // ✅ refresh parent list
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-3">Add New Dataset</h2>

        {/* Indicator search + filter */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search indicators..."
            className="border rounded px-2 py-1 text-sm flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
          >
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="border rounded max-h-48 overflow-y-auto mb-3">
          {filteredIndicators.length ? (
            filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                onClick={() => setSelectedIndicator(ind)}
                className={`px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 ${
                  selectedIndicator?.id === ind.id ? "bg-green-50 font-medium" : ""
                }`}
              >
                {ind.name}{" "}
                <span className="text-xs text-gray-500">
                  ({ind.code} – {ind.default_admin_level})
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic px-2 py-2">No indicators found.</p>
          )}
        </div>

        {/* Selected indicator summary */}
        {selectedIndicator && (
          <div className="bg-gray-50 border rounded p-2 text-sm mb-3">
            <p className="font-semibold">{selectedIndicator.name}</p>
            <p>Theme: {selectedIndicator.theme}</p>
            <p>Type: {selectedIndicator.type}</p>
            <p>Admin Level: {selectedIndicator.default_admin_level}</p>
            <p>Data Type: {selectedIndicator.data_type}</p>
          </div>
        )}

        {/* Metadata fields */}
        <div className="space-y-2 mb-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium">Source Name</label>
              <input
                type="text"
                value={form.sourceName}
                onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
                className="border rounded px-2 py-1 w-full text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Source URL</label>
              <input
                type="text"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                className="border rounded px-2 py-1 w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={uploading}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded flex items-center gap-1 disabled:opacity-60"
          >
            {uploading && <Loader2 className="animate-spin w-4 h-4" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}
