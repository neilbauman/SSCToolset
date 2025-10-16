"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, PlusCircle, ArrowUpDown, Search, Tag, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import DatasetPreview from "@/components/country/DatasetPreview";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import ConfirmDeleteDatasetModal from "@/components/country/ConfirmDeleteDatasetModal";

type DatasetMeta = {
  id: string;
  title: string;
  dataset_type: "adm0" | "gradient" | "categorical" | string | null;
  data_format: "numeric" | "text" | string | null;
  data_type: string | null;
  admin_level: string | null;
  year: number | null;
  source_name: string | null;
  unit: string | null;
  record_count: number | null;
  created_at: string;
  country_iso: string;
  indicator_id: string | null;
  join_field: string | null;
};

type SortKey =
  | "title" | "dataset_type" | "data_format" | "data_type" | "admin_level"
  | "year" | "source_name" | "record_count" | "created_at"
  | "taxonomy_category" | "taxonomy_term";

type TaxMeta = { category: string; term: string };

export default function CountryDatasetsPage() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DatasetMeta[]>([]);
  const [taxByIndicator, setTaxByIndicator] = useState<Record<string, TaxMeta>>({});
  const [selected, setSelected] = useState<DatasetMeta | null>(null);
  const [q, setQ] = useState(""); const [sortBy, setSortBy] = useState<SortKey>("created_at"); const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [edit, setEdit] = useState<DatasetMeta | null>(null);
  const [del, setDel] = useState<DatasetMeta | null>(null);

  useEffect(() => {
    if (!iso) return;
    (async () => {
      const { data, error } = await supabase.from("dataset_metadata").select("*").eq("country_iso", iso).order("created_at", { ascending: false });
      if (error) { setError(error.message); setLoading(false); return; }
      const list = (data as DatasetMeta[]) || [];
      setRows(list);

      // Build taxonomy map: indicator -> {category, term}
      const indicatorIds = Array.from(new Set(list.map(d => d.indicator_id).filter(Boolean))) as string[];
      if (indicatorIds.length) {
        const { data: links } = await supabase.from("indicator_taxonomy_links").select("indicator_id,taxonomy_id").in("indicator_id", indicatorIds);
        const termIds = Array.from(new Set((links||[]).map((l:any)=>l.taxonomy_id).filter(Boolean)));
        let terms: Record<string,{category:string,name:string}> = {};
        if (termIds.length) {
          const { data: trows } = await supabase.from("taxonomy_terms").select("id,category,name").in("id", termIds);
          (trows||[]).forEach((t:any)=>terms[t.id] = {category:t.category, name:t.name});
        }
        const agg: Record<string, TaxMeta> = {};
        (links||[]).forEach((l:any) => {
          const t = terms[l.taxonomy_id]; if (!t) return;
          const prev = agg[l.indicator_id] || { category: "", term: "" };
          agg[l.indicator_id] = {
            category: prev.category ? prev.category : t.category,
            term: prev.term ? `${prev.term} • ${t.name}` : t.name,
          };
        });
        setTaxByIndicator(agg);
      }
      setLoading(false);
    })();
  }, [iso]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows;
    if (needle) {
      r = r.filter(d => {
        const tax = d.indicator_id ? taxByIndicator[d.indicator_id] : undefined;
        return [
          d.title, d.dataset_type, d.data_format, d.data_type, d.admin_level, d.year, d.source_name,
          tax?.category, tax?.term
        ].map(x => (x ?? "").toString().toLowerCase()).join(" ").includes(needle);
      });
    }
    return [...r].sort((a,b)=>{
      const getV = (d: DatasetMeta) => {
        const tax = d.indicator_id ? taxByIndicator[d.indicator_id] : undefined;
        switch (sortBy) {
          case "taxonomy_category": return tax?.category ?? "";
          case "taxonomy_term": return tax?.term ?? "";
          default: return (d as any)[sortBy];
        }
      };
      const A = getV(a), B = getV(b);
      if (A===B) return 0; if (A==null) return 1; if (B==null) return -1;
      if (typeof A==="number" && typeof B==="number") return sortDir==="asc"?A-B:B-A;
      const as=String(A).toLowerCase(), bs=String(B).toLowerCase();
      return sortDir==="asc" ? (as>bs?1:-1) : (as<bs?1:-1);
    });
  }, [rows, q, sortBy, sortDir, taxByIndicator]);

  const toggleSort = (k: SortKey) => { if (sortBy===k) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortBy(k); setSortDir("asc"); } };

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("dataset_metadata").select("*").eq("country_iso", iso).order("created_at",{ascending:false});
    setRows((data as any) || []); setSelected(null); setEdit(null); setDel(null); setLoading(false);
  };

  if (!iso) {
    return (
      <SidebarLayout headerProps={{ title:"Loading country…", group:"country-config", description:"Waiting for route params.", tool:"Dataset Manager",
        breadcrumbs:<Breadcrumbs items={[{label:"Countries",href:"/country"},{label:"Datasets"}]} /> }}>
        <div className="rounded-xl border p-3 text-sm text-gray-600">Country ID missing in route.</div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout headerProps={{
      title:`${iso} – Datasets`, group:"country-config",
      description:"Catalogue of uploaded datasets. Select one to preview the raw data below.",
      tool:"Dataset Manager",
      breadcrumbs:<Breadcrumbs items={[{label:"Countries",href:"/country"},{label:iso,href:`/country/${iso}`},{label:"Datasets"}]} />
    }}>
      {/* Toolbar */}
      <div className="rounded-xl p-3 flex items-center justify-between" style={{background:"var(--gsc-beige)", border:"1px solid var(--gsc-light-gray)"}}>
        <div className="flex items-center gap-2">
          <div className="text-sm text-[var(--gsc-gray)]"><span className="font-semibold">{filtered.length}</span> datasets</div>
          <div className="relative ml-4">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title, type, format, source, taxonomy…" className="rounded-lg border px-8 py-1 text-sm" style={{borderColor:"var(--gsc-light-gray)"}}/>
            <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400"/>
          </div>
        </div>
        <Link href={`/country/${iso}/datasets/add`} className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-white" style={{background:"var(--gsc-blue)"}}>
          <PlusCircle className="h-4 w-4"/> Add Dataset
        </Link>
      </div>

      {/* Versions table */}
      <div className="overflow-auto rounded-xl" style={{border:"1px solid var(--gsc-light-gray)"}}>
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase" style={{background:"var(--gsc-beige)", color:"var(--gsc-gray)"}}>
            <tr>
              {[
                ["title","Title"],["dataset_type","Type"],["data_format","Format"],["data_type","Data Type"],
                ["admin_level","Admin"],["year","Year"],["source_name","Source"],
                ["taxonomy_category","Taxonomy Category"],["taxonomy_term","Taxonomy Term"],
                ["record_count","Records"],["created_at","Created"],["actions","Actions"]
              ].map(([k,lab])=>(
                <th key={k} className="px-2 py-2">
                  {k==="actions" ? lab : (
                    <button className="inline-flex items-center gap-1" onClick={()=>toggleSort(k as SortKey)} title={`Sort by ${lab}`}>
                      {lab}<ArrowUpDown className="h-3 w-3 opacity-60"/>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="px-2 py-3 text-gray-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2"/>Loading datasets…</td></tr>
            ) : error ? (
              <tr><td colSpan={12} className="px-2 py-3 text-red-700">{error}</td></tr>
            ) : filtered.length===0 ? (
              <tr><td colSpan={12} className="px-2 py-3 text-gray-500">No datasets match your filters.</td></tr>
            ) : filtered.map(d=>{
              const isSel = selected?.id===d.id;
              const tax = d.indicator_id ? taxByIndicator[d.indicator_id] : undefined;
              return (
                <tr key={d.id} className="cursor-pointer" onClick={(e)=>{ if ((e.target as HTMLElement).closest("[data-row-actions]")) return; setSelected(isSel?null:d); }}
                    style={{background:isSel?"rgba(0,75,135,0.06)":"white", borderTop:"1px solid var(--gsc-light-gray)"}}>
                  <td className="px-2 py-2 font-medium">{d.title}</td>
                  <td className="px-2 py-2">{d.dataset_type ?? d.data_type}</td>
                  <td className="px-2 py-2">{d.data_format ?? "—"}</td>
                  <td className="px-2 py-2">{d.data_type ?? "—"}</td>
                  <td className="px-2 py-2">{d.admin_level ?? "—"}</td>
                  <td className="px-2 py-2">{d.year ?? "—"}</td>
                  <td className="px-2 py-2">{d.source_name ?? "—"}</td>
                  <td className="px-2 py-2">{tax?.category ?? "—"}</td>
                  <td className="px-2 py-2">{tax?.term ?? "—"}</td>
                  <td className="px-2 py-2 text-right">{d.record_count ?? "—"}</td>
                  <td className="px-2 py-2">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-2 py-2" data-row-actions>
                    <div className="flex items-center gap-2">
                      <button title="Edit metadata" onClick={()=>setEdit(d)} className="p-1 rounded hover:bg-gray-100"><Edit3 className="h-4 w-4 text-[var(--gsc-blue)]"/></button>
                      <button title="Delete dataset" onClick={()=>setDel(d)} className="p-1 rounded hover:bg-gray-100"><Trash2 className="h-4 w-4 text-[var(--gsc-red)]"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline preview */}
      {selected && (
        <div className="rounded-xl p-4" style={{background:"var(--gsc-beige)", border:"1px solid var(--gsc-light-gray)"}}>
          <DatasetPreview dataset={selected} countryIso={iso}/>
        </div>
      )}

      {/* Modals */}
      {edit && <EditDatasetModal dataset={edit} onClose={()=>setEdit(null)} onSaved={refresh} />}
      {del && <ConfirmDeleteDatasetModal dataset={del} onClose={()=>setDel(null)} onDeleted={refresh} />}
    </SidebarLayout>
  );
}
