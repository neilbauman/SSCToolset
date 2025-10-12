"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Eye, Pencil, Trash2, Loader2, Download } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import type { CountryParams } from "@/app/country/types";

type Meta = {
  id: string;
  country_iso: string | null;
  indicator_id: string | null;
  title: string;
  description: string | null;
  source: string | null;
  admin_level: string | null;
  upload_type: string | null;
  theme: string | null;
  year?: number | null;
  created_at: string | null;
};

type IndicatorLite = { id: string; name: string; data_type: string | null; theme: string | null };
type Row = { admin_pcode: string; value: number | null; name?: string | null };

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [countryName, setCountryName] = useState(countryIso);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTpl, setOpenTpl] = useState(false);
  const [datasets, setDatasets] = useState<Meta[]>([]);
  const [indicators, setIndicators] = useState<Record<string, IndicatorLite>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleteMeta, setDeleteMeta] = useState<Meta | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("countries").select("name").eq("iso_code", countryIso).maybeSingle();
      if (data?.name) setCountryName(data.name);
    })();
  }, [countryIso]);

  const loadAll = async () => {
    const { data } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    setDatasets(data || []);
    const ids = Array.from(new Set((data || []).map((d) => d.indicator_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ind } = await supabase.from("indicator_catalogue").select("id,name,data_type,theme").in("id", ids);
      const map: Record<string, IndicatorLite> = {};
      (ind || []).forEach((i) => (map[i.id] = i));
      setIndicators(map);
    } else setIndicators({});
  };

  useEffect(() => {
    loadAll();
  }, [countryIso]);

  const headerProps = {
    title: `${countryName} – Other Datasets`,
    group: "country-config" as const,
    description: "Upload and manage additional datasets such as national statistics or gradient indicators.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryName, href: `/country/${countryIso}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  const parseSource = (src: string | null) => {
    if (!src) return "—";
    try {
      const j = JSON.parse(src);
      if (j?.url)
        return (
          <a className="text-blue-600 hover:underline" href={j.url} target="_blank" rel="noreferrer">
            {j.name || j.url}
          </a>
        );
      return j?.name || "—";
    } catch {
      return src;
    }
  };

  const startPreview = async (m: Meta) => {
    setPreviewId(m.id === previewId ? null : m.id);
    if (m.id === previewId) return;
    setLoadingPreview(true);
    const { data } = await supabase
      .from("view_dataset_values_with_names")
      .select("name, admin_pcode, value")
      .eq("dataset_id", m.id)
      .limit(200);
    setPreviewRows((data || []) as Row[]);
    setLoadingPreview(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dataset_values").delete().eq("dataset_id", id);
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setDeleteMeta(null);
    await loadAll();
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Country Datasets</h2>
        <div className="flex gap-2">
          <button onClick={() => setOpenTpl(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-blue)] hover:opacity-90">
            <Download className="w-4 h-4" /> Template
          </button>
          <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90">
            + Add Dataset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg p-3 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-2 py-1">Title</th>
              <th className="text-left px-2 py-1">Indicator</th>
              <th className="text-left px-2 py-1">Type</th>
              <th className="text-left px-2 py-1">Admin Level</th>
              <th className="text-left px-2 py-1">Data Type</th>
              <th className="text-left px-2 py-1">Health</th>
              <th className="text-left px-2 py-1">Source</th>
              <th className="text-right px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => {
              const ind = d.indicator_id ? indicators[d.indicator_id] : null;
              return (
                <tr key={d.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-1 font-medium">{d.title}</td>
                  <td className="px-2 py-1">{ind ? ind.name : "—"}</td>
                  <td className="px-2 py-1">{d.upload_type || "—"}</td>
                  <td className="px-2 py-1">{d.admin_level || "—"}</td>
                  <td className="px-2 py-1">{ind?.data_type || "—"}</td>
                  <td className="px-2 py-1"><DatasetHealth datasetId={d.id} /></td>
                  <td className="px-2 py-1">{parseSource(d.source)}</td>
                  <td className="px-2 py-1 text-right">
                    <button className="p-1 rounded hover:bg-gray-100" title="Preview" onClick={() => startPreview(d)}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100" title="Edit" onClick={() => setPreviewId(null)}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100 text-[color:var(--gsc-red)]" title="Delete" onClick={() => setDeleteMeta(d)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!datasets.length && (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-gray-500">
                  No datasets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      {previewId && (
        <div className="mt-4 border rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="font-semibold">
              Dataset Preview — {datasets.find((d) => d.id === previewId)?.title}
            </div>
            <button className="text-sm underline" onClick={() => setPreviewId(null)}>Close</button>
          </div>
          {loadingPreview ? (
            <div className="p-6 text-sm text-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">PCode</th>
                    <th className="text-left px-2 py-1">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={`${r.admin_pcode}-${i}`} className="border-b last:border-b-0">
                      <td className="px-2 py-1">{r.name ?? "—"}</td>
                      <td className="px-2 py-1">{r.admin_pcode}</td>
                      <td className="px-2 py-1">{r.value ?? "—"}</td>
                    </tr>
                  ))}
                  {!previewRows.length && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-gray-500">No rows.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {openAdd && <AddDatasetModal open={openAdd} countryIso={countryIso} onClose={() => setOpenAdd(false)} onCreated={loadAll} />}
      {openTpl && <TemplateDownloadModal open={openTpl} onClose={() => setOpenTpl(false)} countryIso={countryIso} />}
      {deleteMeta && (
        <ConfirmDeleteModal
          open={!!deleteMeta}
          message={`Delete dataset "${deleteMeta.title}" and all of its values?`}
          onClose={() => setDeleteMeta(null)}
          onConfirm={() => handleDelete(deleteMeta.id)}
        />
      )}
    </SidebarLayout>
  );
}
