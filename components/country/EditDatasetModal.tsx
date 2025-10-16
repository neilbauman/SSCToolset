"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Loader2, Search } from "lucide-react";

type DatasetMeta = {
  id: string;
  title: string;
  admin_level: string | null;
  dataset_type: string | null;
  data_format: string | null;
  data_type: string | null;
  year: number | null;
  unit: string | null;
  join_field: string | null;
  source_name: string | null;
  source_url: string | null;
  indicator_id: string | null;
};

type Indicator = { id: string; name: string };

export default function EditDatasetModal({
  dataset,
  onClose,
  onSaved,
}: {
  dataset: DatasetMeta;
  onClose: () => void;
  onSaved: (updated: DatasetMeta) => void;
}) {
  const [form, setForm] = useState<DatasetMeta>(dataset);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loadingInd, setLoadingInd] = useState(false);
  const [taxonomy, setTaxonomy] = useState<{ category: string | null; term: string | null }>({ category: null, term: null });

  useEffect(() => {
    (async () => {
      // preload some indicators
      setLoadingInd(true);
      const { data } = await supabase.from("indicator_catalogue").select("id,name").order("name").limit(1000);
      setIndicators(((data || []) as Indicator[]));
      setLoadingInd(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!form.indicator_id) {
        setTaxonomy({ category: null, term: null });
        return;
      }
      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("taxonomy_id")
        .eq("indicator_id", form.indicator_id)
        .limit(1);
      const tid = links?.[0]?.taxonomy_id;
      if (!tid) {
        setTaxonomy({ category: null, term: null });
        return;
      }
      const { data: term } = await supabase.from("taxonomy_terms").select("category,name").eq("id", tid).maybeSingle();
      setTaxonomy({ category: (term as any)?.category ?? null, term: (term as any)?.name ?? null });
    })();
  }, [form.indicator_id]);

  async function save() {
    setSaving(true);
    const payload = {
      title: form.title,
      admin_level: form.admin_level,
      year: form.year,
      unit: form.unit,
      join_field: form.join_field,
      source_name: form.source_name,
      source_url: form.source_url,
      indicator_id: form.indicator_id,
    };
    const { data, error } = await supabase.from("dataset_metadata").update(payload).eq("id", form.id).select("*").maybeSingle();
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved(data as DatasetMeta);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-lg" style={{ border: "1px solid var(--gsc-light-gray)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold" style={{ color: "var(--gsc-gray)" }}>
            Edit Dataset
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Title</div>
            <input className="w-full rounded border p-2" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Year</div>
            <input className="w-full rounded border p-2" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Unit</div>
            <input className="w-full rounded border p-2" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value || null })} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Join Field</div>
            <input className="w-full rounded border p-2" placeholder="admin_pcode" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.join_field ?? ""} onChange={(e) => setForm({ ...form, join_field: e.target.value || null })} />
          </label>

          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-gray-600">Source Name</div>
            <input className="w-full rounded border p-2" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.source_name ?? ""} onChange={(e) => setForm({ ...form, source_name: e.target.value || null })} />
          </label>

          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-gray-600">Source URL</div>
            <input className="w-full rounded border p-2" style={{ borderColor: "var(--gsc-light-gray)" }} value={form.source_url ?? ""} onChange={(e) => setForm({ ...form, source_url: e.target.value || null })} />
          </label>

          <div className="md:col-span-2">
            <div className="mb-1 text-gray-600 text-sm">Indicator (links taxonomy)</div>
            <div className="flex gap-2 items-center">
              <div className="relative grow">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search indicators…" className="w-full rounded border px-8 py-2 text-sm" style={{ borderColor: "var(--gsc-light-gray)" }} />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <select
                className="rounded border p-2 text-sm"
                style={{ borderColor: "var(--gsc-light-gray)" }}
                value={form.indicator_id ?? ""}
                onChange={(e) => setForm({ ...form, indicator_id: e.target.value || null })}
              >
                <option value="">(none)</option>
                {(indicators || [])
                  .filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
                  .slice(0, 300)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Taxonomy:&nbsp;
              <span className="font-medium">{taxonomy.category ?? "—"}</span>
              {taxonomy.term ? <> • <span>{taxonomy.term}</span></> : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-1.5 border" style={{ borderColor: "var(--gsc-light-gray)" }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded px-3 py-1.5 text-white"
            style={{ background: "var(--gsc-blue)" }}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
