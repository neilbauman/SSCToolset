"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Pencil, Trash2 } from "lucide-react";

type DatasetRow = {
  id: string;
  title: string;
  year: number | null;
  admin_level: string | null;
  data_type: "gradient" | "categorical";
  data_format: "numeric" | "percentage" | "text";
  indicator_id: string | null;
  indicator_name: string | null;
};
type Term = { id: string; name: string; category: string | null; sort_order?: number | null };

const H = "text-sm font-semibold text-[color:var(--gsc-gray)]";
const TH = "text-left text-xs font-medium text-gray-500 px-3 py-2 border-b";
const TD = "px-3 py-2 border-b text-sm";
const BTN = "inline-flex items-center gap-2 rounded px-2 py-1 text-sm border hover:bg-gray-50";
const CARD = "rounded border bg-white shadow-sm";

export default function Page() {
  const params = useParams<{ id: string }>();
  const countryIso = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [taxonomyByIndicator, setTaxonomyByIndicator] = useState<Record<string, Term[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // fetch datasets + indicator names
  async function loadDatasets() {
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,year,admin_level,data_type,data_format,indicator_id,indicator_catalogue(name)")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows: DatasetRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        year: r.year ?? null,
        admin_level: r.admin_level ?? null,
        data_type: r.data_type,
        data_format: r.data_format,
        indicator_id: r.indicator_id ?? null,
        indicator_name: r.indicator_catalogue?.name ?? null,
      }));
      setDatasets(rows);

      // taxonomy terms for each indicator (category + name)
      const indIds = Array.from(new Set(rows.map(r => r.indicator_id).filter(Boolean))) as string[];
      if (indIds.length) {
        const { data: links, error: linkErr } = await supabase
          .from("indicator_taxonomy_links")
          .select("indicator_id,taxonomy_id")
          .in("indicator_id", indIds);
        if (linkErr) throw linkErr;
        const termIds = Array.from(new Set((links ?? []).map((l: any) => l.taxonomy_id)));
        let termMap: Record<string, Term> = {};
        if (termIds.length) {
          const { data: terms, error: termErr } = await supabase
            .from("taxonomy_terms")
            .select("id,name,category,sort_order")
            .in("id", termIds)
            .order("sort_order", { ascending: true });
          if (termErr) throw termErr;
          for (const t of terms ?? []) termMap[t.id] = t as Term;
        }
        const grouped: Record<string, Term[]> = {};
        (links ?? []).forEach((l: any) => {
          const term = termMap[l.taxonomy_id];
          if (!term) return;
          const arr = grouped[l.indicator_id] ?? [];
          arr.push(term);
          grouped[l.indicator_id] = arr;
        });
        // sort each indicator’s terms by sort_order then name
        Object.keys(grouped).forEach(k => {
          grouped[k] = grouped[k].sort((a, b) => {
            const sa = a.sort_order ?? 0, sb = b.sort_order ?? 0;
            if (sa !== sb) return sa - sb;
            return (a.name ?? "").localeCompare(b.name ?? "");
          });
        });
        setTaxonomyByIndicator(grouped);
      } else {
        setTaxonomyByIndicator({});
      }

      // default select first
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  }

  // fetch preview for selected dataset
  async function loadPreview(dataset: DatasetRow) {
    setDataLoading(true); setDataPreview([]); setErr(null);
    try {
      if (dataset.data_type === "gradient") {
        // prefer the view with names if available
        const { data, error } = await supabase
          .from("view_dataset_values_with_names")
          .select("admin_pcode,admin_name,admin_level,value,text_value,category_label")
          .eq("dataset_id", dataset.id)
          .limit(50);
        if (error && error.code !== "PGRST204") throw error; // ignore if view not found
        if (data?.length) {
          setDataPreview(data);
        } else {
          const { data: fallback, error: e2 } = await supabase
            .from("dataset_values")
            .select("admin_pcode,admin_level,value,text_value")
            .eq("dataset_id", dataset.id)
            .limit(50);
          if (e2) throw e2;
          setDataPreview(fallback ?? []);
        }
      } else {
        const { data, error } = await supabase
          .from("dataset_values_cat")
          .select("admin_pcode,admin_level,category_code,category_label")
          .eq("dataset_id", dataset.id)
          .limit(100);
        if (error) throw error;
        setDataPreview(data ?? []);
      }
    } catch (e: any) {
      setErr(e.message ?? "Failed to load dataset preview.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => { loadDatasets(); /* eslint-disable-next-line */ }, [countryIso]);

  useEffect(() => {
    const ds = datasets.find(d => d.id === selectedId);
    if (ds) loadPreview(ds);
  }, [selectedId, datasets]);

  // helpers
  const selectedDataset = useMemo(() => datasets.find(d => d.id === selectedId) ?? null, [datasets, selectedId]);

  async function onDelete(id: string) {
    const ds = datasets.find(d => d.id === id);
    if (!ds) return;
    const ok = confirm(`Delete dataset "${ds.title}"? This cannot be undone.`);
    if (!ok) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("dataset_metadata").delete().eq("id", id);
      if (error) throw error;
      setDatasets(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e: any) {
      alert(e.message ?? "Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  function onEdit(id: string) {
    // Hook this into your wizard open/edit path.
    alert("Edit dataset coming soon.");
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={H}>Country Datasets</h1>
      </div>

      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{err}</div>}

      <div className={`${CARD}`}>
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">Datasets</div>
          {loading && <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={TH}>Title</th>
                <th className={TH}>Year</th>
                <th className={TH}>Admin</th>
                <th className={TH}>Type</th>
                <th className={TH}>Format</th>
                <th className={TH}>Indicator</th>
                <th className={TH}>Taxonomy Category</th>
                <th className={TH}>Taxonomy Term(s)</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map(d => {
                const terms = d.indicator_id ? (taxonomyByIndicator[d.indicator_id] ?? []) : [];
                const cat = terms[0]?.category ?? "";
                const names = terms.map(t => t.name).join(", ");
                const isSel = d.id === selectedId;
                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isSel ? "bg-gray-50" : ""}`}
                    onClick={() => setSelectedId(d.id)}
                  >
                    <td className={`${TD} ${isSel ? "font-semibold" : ""}`}>{d.title}</td>
                    <td className={TD}>{d.year ?? "-"}</td>
                    <td className={TD}>{d.admin_level ?? "-"}</td>
                    <td className={TD}>{d.data_type}</td>
                    <td className={TD}>{d.data_format}</td>
                    <td className={TD}>{d.indicator_name ?? "—"}</td>
                    <td className={TD}>{cat || "—"}</td>
                    <td className={TD}>{names || "—"}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <button className={BTN} onClick={(e) => { e.stopPropagation(); onEdit(d.id); }}>
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button className={`${BTN} text-[color:var(--gsc-red)]`} onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}>
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && datasets.length === 0 && (
                <tr><td className="px-3 py-6 text-sm text-gray-500" colSpan={9}>No datasets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Preview panel */}
      <div className={`${CARD}`}>
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">Data Preview{selectedDataset ? ` — ${selectedDataset.title}` : ""}</div>
          {dataLoading && <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        </div>

        {!selectedDataset ? (
          <div className="p-4 text-sm text-gray-500">Select a dataset above to preview its rows.</div>
        ) : (
          <div className="p-3 overflow-x-auto">
            {dataPreview.length === 0 ? (
              <div className="text-sm text-gray-500">No rows to display.</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    {Object.keys(dataPreview[0]).map((k) => (
                      <th key={k} className={TH}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataPreview.map((r, i) => (
                    <tr key={i} className="odd:bg-gray-50">
                      {Object.keys(dataPreview[0]).map((k) => (
                        <td key={k} className={TD}>{String(r[k] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
