"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, X } from "lucide-react";

type EditIndicatorModalProps = {
  open: boolean;
  indicator?: any | null;
  onClose: () => void;
  onSave: () => Promise<void> | void;
};

type FrameworkRef = { id: string; name: string };

const CATEGORIES = [
  { key: "ssc", label: "SSC Framework" },
  { key: "vulnerability", label: "Underlying Vulnerabilities" },
  { key: "hazard", label: "Hazard & Impact Data" },
];

export default function EditIndicatorModal({
  open,
  indicator,
  onClose,
  onSave,
}: EditIndicatorModalProps) {
  const isNew = !indicator;
  const [form, setForm] = useState<any>({
    code: "",
    name: "",
    topic: "",
    data_type: "",
    unit: "",
    type: "",
    description: "",
    pillar_id: null,
    theme_id: null,
    subtheme_id: null,
    categories: [] as string[],
  });

  const [pillars, setPillars] = useState<FrameworkRef[]>([]);
  const [themes, setThemes] = useState<FrameworkRef[]>([]);
  const [subthemes, setSubthemes] = useState<FrameworkRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 Load SSC Framework references
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("ssc_pillars").select("id,name");
      const { data: t } = await supabase.from("ssc_themes").select("id,name");
      const { data: s } = await supabase.from("ssc_subthemes").select("id,name");
      setPillars(p || []);
      setThemes(t || []);
      setSubthemes(s || []);
      setLoading(false);
    })();
  }, [open]);

  // 🔹 Load indicator + categories
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (indicator?.id) {
        const { data: cats } = await supabase
          .from("indicator_categories")
          .select("category")
          .eq("indicator_id", indicator.id);
        setForm({
          ...indicator,
          categories: (cats || []).map((c) => c.category),
        });
      } else {
        setForm({
          code: "",
          name: "",
          topic: "",
          data_type: "",
          unit: "",
          type: "",
          description: "",
          pillar_id: null,
          theme_id: null,
          subtheme_id: null,
          categories: [],
        });
      }
    })();
  }, [indicator, open]);

  const handleChange = (field: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [field]: value }));

  // 🔹 Save
  const handleSave = async () => {
    setSaving(true);
    try {
      let id = indicator?.id;
      if (isNew) {
        const { data, error } = await supabase
          .from("indicator_catalogue")
          .insert([
            {
              ...form,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase
          .from("indicator_catalogue")
          .update({
            ...form,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
        await supabase.from("indicator_categories").delete().eq("indicator_id", id);
      }

      if (form.categories.length > 0) {
        const rows = form.categories.map((cat: string) => ({
          indicator_id: id,
          category: cat,
        }));
        await supabase.from("indicator_categories").insert(rows);
      }

      await onSave();
      onClose();
    } catch (err) {
      console.error("Error saving indicator:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">
          {isNew ? "Add New Indicator" : "Edit Indicator"}
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading framework...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Code</label>
              <input
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.code || ""}
                onChange={(e) => handleChange("code", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <input
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Description</label>
              <textarea
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Topic</label>
              <input
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.topic || ""}
                onChange={(e) => handleChange("topic", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Unit</label>
              <input
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.unit || ""}
                onChange={(e) => handleChange("unit", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Data Type</label>
              <select
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.data_type || ""}
                onChange={(e) => handleChange("data_type", e.target.value)}
              >
                <option value="">—</option>
                <option value="numeric">Numeric</option>
                <option value="percentage">Percentage</option>
                <option value="categorical">Categorical</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Type</label>
              <input
                className="border rounded w-full px-2 py-1 text-sm"
                value={form.type || ""}
                onChange={(e) => handleChange("type", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">
                Categories
              </label>
              <div className="flex gap-3 flex-wrap">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.categories.includes(c.key)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev: any) => ({
                          ...prev,
                          categories: checked
                            ? [...prev.categories, c.key]
                            : prev.categories.filter((x: string) => x !== c.key),
                        }));
                      }}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-sm text-gray-600">Pillar</label>
                <select
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.pillar_id || ""}
                  onChange={(e) => handleChange("pillar_id", e.target.value)}
                >
                  <option value="">—</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Theme</label>
                <select
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.theme_id || ""}
                  onChange={(e) => handleChange("theme_id", e.target.value)}
                >
                  <option value="">—</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Subtheme</label>
                <select
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.subtheme_id || ""}
                  onChange={(e) => handleChange("subtheme_id", e.target.value)}
                >
                  <option value="">—</option>
                  {subthemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
