"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, Info } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

const LABEL = "block text-xs font-medium text-gray-600 mb-1";
const FIELD = "w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-[color:var(--gsc-blue)]";
const CARD = "border rounded-md cursor-pointer hover:bg-gray-50";

type Indicator = { id: string; name: string; theme: string | null; code?: string | null; data_type?: string | null };
type DatasetMeta = {
  id: string;
  country_iso: string | null;
  indicator_id: string | null;
  title: string;
  description: string | null;
  admin_level: string | null;
  theme: string | null;
  year: number | null;
  created_at: string | null;
  dataset_type: string | null;
  data_type: string | null;
  unit: string | null;
  source_name: string | null;
  source_url: string | null;
};

export default function EditDatasetModal({
  open,
  dataset,
  onClose,
  onSave,
}: {
  open: boolean;
  dataset: DatasetMeta;
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(dataset.title);
  const [year, setYear] = useState<number | null>(dataset.year);
  const [adminLevel, setAdminLevel] = useState(dataset.admin_level || "ADM0");
  const [datasetType, setDatasetType] = useState(dataset.dataset_type || "Gradient");
  const [dataType, setDataType] = useState(dataset.data_type || "Numeric");
  const [description, setDescription] = useState(dataset.description || "");
  const [unit, setUnit] = useState(dataset.unit || "");
  const [sourceName, setSourceName] = useState(dataset.source_name || "");
  const [sourceUrl, setSourceUrl] = useState(dataset.source_url || "");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("All");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(dataset.indicator_id);

  // Fetch indicator list
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("indicator_catalogue").select("id,name,theme,code,data_type");
      setIndicators(data || []);
    })();
  }, [open]);

  const filteredIndicators = indicators.filter(
    i =>
      (theme === "All" || i.theme === theme) &&
      i.name.toLowerCase().includes(search.toLowerCase())
  );
  const themes = Array.from(new Set(indicators.map(i => i.theme).filter(Boolean))) as string[];

  const handleSave = async () => {
    try {
      setSaving(true);
      const source = sourceName || sourceUrl ? JSON.stringify({ name: sourceName || null, url: sourceUrl || null }) : null;
      const payload = {
        title,
        year,
        admin_level: adminLevel,
        upload_type: datasetType,
        description: description || null,
        indicator_id: selectedIndicatorId,
        source,
      };
      const { error } = await supabase.from("dataset_metadata").update(payload).eq("id", dataset.id);
      if (error) throw error;
      setSaving(false);
      onSave();
      onClose();
    } catch (e: any) {
      setSaving(false);
      alert("Error saving dataset: " + e.message);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg ${open ? "opacity-100" : "opacity-0"}`}>
        <div className="flex justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Edit Dataset</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left panel: dataset fields */}
          <div className="space-y-3">
            <div>
              <label className={LABEL}>
  Data Type 
  <span className="inline-flex items-center ml-1" title="For display reference only">
    <Info className="w-3 h-3 text-gray-400" />
  </span>
</label>
              <input className={FIELD} value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Year</label>
                <input type="number" className={FIELD} value={year ?? ""} onChange={e => setYear(e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className={LABEL}>Admin Level</label>
                <select className={FIELD} value={adminLevel} onChange={e => setAdminLevel(e.target.value)}>
                  {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Dataset Type</label>
                <select className={FIELD} value={datasetType} onChange={e => setDatasetType(e.target.value)}>
                  <option>Gradient</option>
                  <option>Tabular</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Data Type <Info className="inline w-3 h-3 text-gray-400 ml-1" title="For display reference only" /></label>
                <select className={FIELD} value={dataType} onChange={e => setDataType(e.target.value)}>
                  <option>Numeric</option>
                  <option>Percentage</option>
                  <option>Text</option>
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Unit</label>
              <input className={FIELD} value={unit} onChange={e => setUnit(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <label className={LABEL}>Source Name</label>
              <input className={FIELD} value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. National Statistics Office" />
            </div>
            <div>
              <label className={LABEL}>Source URL</label>
              <input className={FIELD} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://example.org" />
            </div>
            <div>
              <label className={LABEL}>Description</label>
              <textarea className={FIELD} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="text-xs text-gray-500">
              <p>Created: {dataset.created_at ? new Date(dataset.created_at).toLocaleDateString() : "—"}</p>
            </div>
          </div>

          {/* Right panel: indicators */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={LABEL}>Search Indicators</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input className={`${FIELD} pl-8`} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="w-32">
                <label className={LABEL}>Theme</label>
                <select className={FIELD} value={theme} onChange={e => setTheme(e.target.value)}>
                  <option>All</option>
                  {themes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="max-h-[420px] overflow-auto border rounded-md p-2">
              {filteredIndicators.map(i => {
                const active = selectedIndicatorId === i.id;
                return (
                  <div
                    key={i.id}
                    onClick={() => setSelectedIndicatorId(active ? null : i.id)}
                    className={`${CARD} p-3 mb-2 ${active ? "border-[color:var(--gsc-blue)] bg-blue-50/30" : "bg-white"}`}
                  >
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {i.theme ? `${i.theme} • ` : ""}{i.code || i.id}{i.data_type ? ` • ${i.data_type}` : ""}
                    </div>
                  </div>
                );
              })}
              {!filteredIndicators.length && <div className="text-sm text-gray-500 py-6 text-center">No indicators found.</div>}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              Linking an indicator is optional. You can add or change it later.
            </div>
          </div>
        </div>
        <div className="border-t bg-gray-50 flex justify-end gap-2 px-5 py-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
