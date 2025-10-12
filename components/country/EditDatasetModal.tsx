"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Info, Search } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  dataset: { id: string } | null;
  onClose: () => void;
  onSave: () => void;
};

type Indicator = { id: string; name: string; theme: string | null; code: string; data_type: string | null };
type Theme = { name: string };

export default function EditDatasetModal({ open, dataset, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [datasetType, setDatasetType] = useState("Gradient");
  const [dataType, setDataType] = useState("Numeric");
  const [unit, setUnit] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [theme, setTheme] = useState("All");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dataset) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("view_dataset_full")
        .select(
          "id, title, year, admin_level, dataset_type, data_type, unit, source_name, source_url, description, indicator_id, theme"
        )
        .eq("id", dataset.id)
        .single();
      if (data) {
        setTitle(data.title || "");
        setYear(data.year || "");
        setAdminLevel(data.admin_level || "ADM0");
        setDatasetType(data.dataset_type || "Gradient");
        setDataType(data.data_type || "Numeric");
        setUnit(data.unit || "");
        setSourceName(data.source_name || "");
        setSourceUrl(data.source_url || "");
        setDescription(data.description || "");
        setSelectedIndicator(data.indicator_id || null);
        setTheme(data.theme || "All");
      }
      setLoading(false);

      const { data: inds } = await supabase
        .from("indicator_catalogue")
        .select("id,name,theme,code,data_type")
        .order("theme,name");
      setIndicators(inds || []);
      const uniqueThemes = Array.from(new Set((inds || []).map((i) => i.theme).filter(Boolean))).map((t) => ({ name: t! }));
      setThemes(uniqueThemes);
    })();
  }, [open, dataset]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter(
      (i) =>
        (theme === "All" || i.theme === theme) &&
        (i.name?.toLowerCase().includes(search.toLowerCase()) ||
          i.code?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [indicators, theme, search]);

  const handleSave = async () => {
    if (!dataset) return;
    setSaving(true);
    try {
      const payload = {
        title,
        year: year || null,
        admin_level: adminLevel,
        dataset_type: datasetType,
        data_type: dataType,
        unit: unit || null,
        source_name: sourceName || null,
        source_url: sourceUrl || null,
        description: description || null,
        indicator_id: selectedIndicator,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("dataset_metadata").update(payload).eq("id", dataset.id);
      if (error) throw error;
      setSaving(false);
      onSave();
      onClose();
    } catch (e: any) {
      alert(`Error saving dataset: ${e.message}`);
      setSaving(false);
    }
  };

  if (!open) return null;

  const LABEL = "block text-sm font-medium text-gray-600 mb-1";
  const FIELD = "w-full border rounded-md px-2 py-1 text-sm";
  const CARD = "border rounded-md cursor-pointer transition-all";

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg">
        <div className="flex justify-between items-center border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Edit Dataset</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500 text-sm">Loading dataset...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {/* Left Panel */}
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
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={LABEL}>Admin Level</label>
                  <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Dataset Type</label>
                  <select className={FIELD} value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
                    <option>Gradient</option>
                    <option>Categorical</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>
                    Data Type <Info className="inline w-3 h-3 text-gray-400 ml-1" />
                  </label>
                  <select className={FIELD} value={dataType} onChange={(e) => setDataType(e.target.value)}>
                    <option>Numeric</option>
                    <option>Percentage</option>
                    <option>Text</option>
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
                  <input className={FIELD} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Source URL</label>
                  <input className={FIELD} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Description</label>
                <textarea className={FIELD} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Right Panel */}
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
                <div className="w-36">
                  <select className={FIELD} value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option>All</option>
                    {themes.map((t) => (
                      <option key={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[400px] overflow-auto border rounded-md p-2">
                {filteredIndicators.map((i) => {
                  const active = selectedIndicator === i.id;
                  return (
                    <div
                      key={i.id}
                      className={`${CARD} p-3 mb-2 ${active ? "border-[color:var(--gsc-blue)] bg-blue-50/30" : "bg-white"}`}
                      onClick={() => setSelectedIndicator(active ? null : i.id)}
                    >
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {i.theme ? `${i.theme} • ` : ""}
                        {i.code} • {i.data_type || "—"}
                      </div>
                    </div>
                  );
                })}
                {!filteredIndicators.length && (
                  <div className="text-sm text-gray-500 py-6 text-center">No indicators found.</div>
                )}
              </div>
              <p className="text-xs text-gray-500">Linking an indicator is optional. You can add or change it later.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t px-5 py-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-2 px-4 py-2 rounded-md bg-[color:var(--gsc-red)] text-white hover:opacity-90"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
