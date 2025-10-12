"use client";

import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Search, Info } from "lucide-react";

type DatasetMeta = {
  id: string;
  title: string;
  year: number | null;
  admin_level: string | null;
  dataset_type: string | null;
  data_type: string | null;
  unit: string | null;
  description: string | null;
  source_name: string | null;
  source_url: string | null;
  indicator_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Indicator = {
  id: string;
  name: string;
  theme: string | null;
  code: string;
  data_type: string | null;
};

export default function EditDatasetModal({
  open,
  dataset,
  onClose,
  onSave,
}: {
  open: boolean;
  dataset: DatasetMeta | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [datasetType, setDatasetType] = useState("Gradient");
  const [dataType, setDataType] = useState("Numeric");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [theme, setTheme] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Prepopulate fields on modal open
  useEffect(() => {
    if (!dataset) return;
    setTitle(dataset.title || "");
    setYear(dataset.year || new Date().getFullYear());
    setAdminLevel(dataset.admin_level || "ADM0");
    setDatasetType(dataset.dataset_type || "Gradient");
    setDataType(dataset.data_type || "Numeric");
    setUnit(dataset.unit || "");
    setDescription(dataset.description || "");
    setSourceName(dataset.source_name || "");
    setSourceUrl(dataset.source_url || "");
    setSelectedIndicatorId(dataset.indicator_id || null);
  }, [dataset]);

  // Load indicators
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id,name,theme,code,data_type")
        .order("name", { ascending: true });
      setIndicators(data || []);
    })();
  }, []);

  const filteredIndicators = useMemo(() => {
    let list = indicators;
    if (theme !== "All") list = list.filter((i) => i.theme === theme);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          i.code.toLowerCase().includes(s) ||
          (i.theme || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [indicators, search, theme]);

  const handleSave = async () => {
    if (!dataset) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        year,
        admin_level: adminLevel,
        dataset_type: datasetType,
        data_type: dataType,
        unit: unit || null,
        description: description || null,
        source_name: sourceName || null,
        source_url: sourceUrl || null,
        indicator_id: selectedIndicatorId,
      };
      const { error } = await supabase
        .from("dataset_metadata")
        .update(payload)
        .eq("id", dataset.id);
      if (error) throw error;
      onSave();
      onClose();
    } catch (e: any) {
      setError(`Error saving dataset: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const LABEL = "block text-sm font-medium text-gray-700 mb-1";
  const FIELD =
    "w-full border rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-[color:var(--gsc-blue)] outline-none";
  const CARD =
    "border rounded-md cursor-pointer hover:bg-blue-50 transition-all duration-75";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full">
        <div className="flex justify-between items-center border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Edit Dataset</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-6">
          {/* Left side — dataset metadata */}
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Title *</label>
              <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Year</label>
                <input
                  type="number"
                  className={FIELD}
                  value={year ?? ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={LABEL}>Admin Level</label>
                <select
                  className={FIELD}
                  value={adminLevel}
                  onChange={(e) => setAdminLevel(e.target.value)}
                >
                  {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                    <option key={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Dataset Type</label>
                <select
                  className={FIELD}
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                >
                  <option>Gradient</option>
                  <option>Categorical</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>
                  Data Type
                  <span className="inline-flex items-center ml-1" title="For display reference only">
                    <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </label>
                <select
                  className={FIELD}
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                >
                  <option>Numeric</option>
                  <option>Percentage</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL}>Unit</label>
              <input className={FIELD} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Source Name</label>
                <input
                  className={FIELD}
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Source URL</label>
                <input
                  className={FIELD}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.org"
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>Description</label>
              <textarea
                className={`${FIELD} min-h-[80px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Right side — indicator linking */}
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                <input
                  className={`${FIELD} pl-8`}
                  placeholder="Search indicators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={FIELD}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option>All</option>
                {[...new Set(indicators.map((i) => i.theme).filter(Boolean))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-md p-2">
              {filteredIndicators.map((i) => {
                const selected = selectedIndicatorId === i.id;
                return (
                  <div
                    key={i.id}
                    onClick={() => setSelectedIndicatorId(selected ? null : i.id)}
                    className={`${CARD} p-2 mb-2 ${
                      selected ? "border-[color:var(--gsc-blue)] bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-gray-600">
                      {i.theme ? `${i.theme} • ` : ""}
                      {i.code} • {i.data_type || "—"}
                    </div>
                  </div>
                );
              })}
              {!filteredIndicators.length && (
                <div className="text-center text-sm text-gray-500 py-4">No indicators found.</div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Linking an indicator is optional. You can add or change it later.
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center border-t bg-gray-50 px-5 py-3 gap-3">
          {error && <div className="text-sm text-red-600 flex-1">{error}</div>}
          <button
            className="px-4 py-2 rounded-md border text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90 text-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
