"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Eye, Pencil, Trash2, Loader2, Download } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import type { CountryParams } from "@/app/country/types";

type Meta = {
  id: string; title: string; indicator_id: string | null;
  admin_level: string | null; dataset_type: string | null; data_type: string | null;
  source_name: string | null; source_url: string | null; description: string | null;
  unit: string | null; year: number | null; created_at: string | null;
};
type Row = { admin_pcode: string; value: number | null; unit: string | null };

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [countryName, setCountryName] = useState(countryIso);
  const [datasets, setDatasets] = useState<Meta[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTpl, setOpenTpl] = useState(false);
  const [openEdit, setOpenEdit] = useState<Meta | null>(null);
  const [deleteMeta, setDeleteMeta] = useState<Meta | null>(null);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("countries").select("name").eq("iso_code", countryIso).maybeSingle();
    if (data?.name) setCountryName(data.name);
  })(); }, [countryIso]);

  const loadAll = async () => {
    const { data } = await supabase.from("dataset_metadata")
      .select("*").eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    setDatasets(data || []);
  };
  useEffect(() => { loadAll(); }, [countryIso]);

  const startPreview = async (m: Meta) => {
    setPreviewId(m.id === previewId ? null : m.id);
    if (m.id === previewId) return;
    setLoadingPreview(true);
    const { data } = await supabase.from("dataset_values")
      .select("admin_pcode,value,unit").eq("dataset_id", m.id).limit(200);
    setPreviewRows(data || []);
    setLoadingPreview(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dataset_values").delete().eq("dataset_id", id);
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setDeleteMeta(null); loadAll();
  };

  const renderSource = (d: Meta) => {
    if (d.source_name && d.source_url)
      return <a className="text-blue-600 hover:underline" href={d.source_url} target="_blank">{d.source_name}</a>;
    if (d.source_name) return d.source_name;
    if (d.source_url) return <a className="text-blue-600 hover:underline" href={d.source_url} target="_blank">{d.source_url}</a>;
    return "—";
  };

  const headerProps = {
    title: `${countryName} – Other Datasets`,
    group: "country-config" as const,
    description: "Upload and manage additional datasets such as national statistics or gradient indicators.",
    breadcrumbs: <Breadcrumbs items={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Country Configuration", href: "/country" },
      { label: countryName, href: `/country/${countryIso}` },
      { label: "Other Datasets" },
    ]} />,
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Country Datasets</h2>
        <div className="flex gap-2">
          <button onClick={() => setOpenTpl(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-blue)] hover:opacity-90"><Download className="w-4 h-4" />Template</button>
          <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90">+ Add Dataset</button>
        </div>
      </div>

      <div className="border rounded-lg p-3 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Indicator</th>
              <th className="px-2 py-1 text-left">Type</th>
              <th className="px-2 py-1 text-left">Admin Level</th>
              <th className="px-2 py-1 text-left">Data Type</th>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Created</th>
              <th className="px-2 py-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.id}
                onClick={() => startPreview(d)}
                className={`border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${previewId === d.id ? "font-semibold bg-gray-50" : ""}`}>
                <td className="px-2 py-1">{d.title}</td>
                <td className="px-2 py-1">{d.indicator_id || "—"}</td>
                <td className="px-2 py-1 capitalize">{d.dataset_type || "—"}</td>
                <td className="px-2 py-1">{d.admin_level || "—"}</td>
                <td className="px-2 py-1">{d.data_type || "—"}</td>
                <td className="px-2 py-1">{renderSource(d)}</td>
                <td className="px-2 py-1">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-2 py-1 text-right">
                  <button className="p-1 hover:bg-gray-100 rounded" title="Edit" onClick={(e) => { e.stopPropagation(); setOpenEdit(d); }}><Pencil className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-100 rounded text-[color:var(--gsc-red)]" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteMeta(d); }}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {!datasets.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">No datasets yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {previewId && (
        <div className="mt-4 border rounded-lg bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <div className="font-semibold">Dataset Preview — {datasets.find(d => d.id === previewId)?.title}</div>
            <button className="text-sm underline" onClick={() => setPreviewId(null)}>Close</button>
          </div>
          {loadingPreview ? (
            <div className="p-4 flex items-center text-sm text-gray-500 gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr><th className="px-2 py-1 text-left">Admin PCode</th><th className="px-2 py-1 text-left">Value</th><th className="px-2 py-1 text-left">Unit</th></tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-2 py-1">{r.admin_pcode}</td>
                      <td className="px-2 py-1">{r.value ?? "—"}</td>
                      <td className="px-2 py-1">{r.unit ?? "—"}</td>
                    </tr>
                  ))}
                  {!previewRows.length && <tr><td colSpan={3} className="text-center text-gray-500 py-6">No rows.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {openAdd && <AddDatasetModal open={openAdd} countryIso={countryIso} onClose={() => setOpenAdd(false)} onCreated={loadAll} />}
      {openTpl && <TemplateDownloadModal open={openTpl} onClose={() => setOpenTpl(false)} countryIso={countryIso} />}
      {openEdit && <EditDatasetModal open={!!openEdit} dataset={openEdit} onClose={() => setOpenEdit(null)} onSave={loadAll} />}
      {deleteMeta && <ConfirmDeleteModal open={!!deleteMeta} message={`Delete dataset "${deleteMeta.title}"?`} onClose={() => setDeleteMeta(null)} onConfirm={() => handleDelete(deleteMeta.id)} />}
    </SidebarLayout>
  );
}
