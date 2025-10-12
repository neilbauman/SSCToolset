"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Info, Loader2 } from "lucide-react";

type DatasetMeta = {
  id: string;
  title: string | null;
  description: string | null;
  year: number | null;
  admin_level: string | null;
  dataset_type: string | null;
  data_type: string | null;
  unit: string | null;
  source_name: string | null;
  source_url: string | null;
  is_active: boolean | null;
  indicator_id?: string | null;
  indicator_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  open: boolean;
  dataset: DatasetMeta | null;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function EditDatasetModal({ open, dataset, onClose, onSave }: Props) {
  const [title, setTitle] = useState(dataset?.title || "");
  const [description, setDescription] = useState(dataset?.description || "");
  const [year, setYear] = useState(dataset?.year?.toString() || "");
  const [adminLevel, setAdminLevel] = useState(dataset?.admin_level || "ADM2");
  const [datasetType, setDatasetType] = useState(dataset?.dataset_type || "gradient");
  const [dataType, setDataType] = useState(dataset?.data_type || "numeric");
  const [unit, setUnit] = useState(dataset?.unit || "");
  const [sourceName, setSourceName] = useState(dataset?.source_name || "");
  const [sourceUrl, setSourceUrl] = useState(dataset?.source_url || "");
  const [active, setActive] = useState(dataset?.is_active || false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const LABEL = "block text-xs font-semibold text-[color:var(--gsc-gray)] mb-1";
  const FIELD = "w-full rounded-md border border-gray-300 text-sm px-2 py-1.5 focus:ring-1 focus:ring-[color:var(--gsc-blue)] outline-none";

  const handleSave = async () => {
    if (!dataset?.id) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("dataset_metadata")
        .update({
          title,
          description,
          year: year ? parseInt(year) : null,
          admin_level: adminLevel,
          dataset_type: datasetType,
          data_type: dataType,
          unit,
          source_name: sourceName,
          source_url: sourceUrl,
          is_active: active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dataset.id);

      if (error) throw error;
      setMsg("Saved successfully.");
      await onSave();
      onClose();
    } catch (e: any) {
      setMsg(`Error saving dataset: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Edit Dataset</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600 hover:text-[color:var(--gsc-red)]" />
          </button>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-2 gap-4 p-5">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Title *</label>
              <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Year</label>
                <input
                  className={FIELD}
                  type="number"
                  placeholder="e.g. 2024"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Admin Level</label>
                <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                  {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                    <option key={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Dataset Type</label>
                <select className={FIELD} value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
                  <option value="gradient">Gradient</option>
                  <option value="categorical">Categorical</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>
                  Data Type
                  <Info className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <select className={FIELD} value={dataType} onChange={(e) => setDataType(e.target.value)}>
                  <option value="numeric">Numeric</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL}>Unit</label>
              <input className={FIELD} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <label className="text-sm text-[color:var(--gsc-gray)]">Active Dataset</label>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Source Name</label>
              <input className={FIELD} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            </div>

            <div>
              <label className={LABEL}>Source URL</label>
              <input
                className={FIELD}
                placeholder="https://example.org"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>

            <div>
              <label className={LABEL}>Description</label>
              <textarea
                rows={4}
                className={`${FIELD} resize-none`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className={LABEL}>Linked Indicator</label>
              <div className="text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                {dataset.indicator_name || "— None —"}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Created: {dataset.created_at ? new Date(dataset.created_at).toLocaleDateString() : "—"} <br />
              Updated: {dataset.updated_at ? new Date(dataset.updated_at).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t bg-[color:var(--gsc-beige)] px-5 py-3">
          <button
            className="px-4 py-1.5 text-sm rounded-md mr-2 border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm rounded-md bg-[color:var(--gsc-red)] text-white hover:opacity-90 flex items-center gap-1"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>

        {msg && (
          <div className="px-5 pb-4 text-sm text-[color:var(--gsc-gray)]">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
