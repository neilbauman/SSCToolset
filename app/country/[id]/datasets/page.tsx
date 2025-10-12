"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Eye, Pencil, Trash2, Loader2, Download } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import type { CountryParams } from "@/app/country/types";

type Meta = {
  id: string;
  country_iso: string | null;
  indicator_id: string | null;
  title: string;
  description: string | null;
  source: string | null; // JSON text {name,url}
  admin_level: string | null;
  upload_type: string | null;
  theme: string | null;
  year?: number | null;
  created_at: string | null;
};

type IndicatorLite = { id: string; name: string; data_type: string | null; theme: string | null };
type Row = { admin_pcode: string; value: number | null; unit: string | null };

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [countryName, setCountryName] = useState<string>(countryIso);

  const [openAdd, setOpenAdd] = useState(false);
  const [openTpl, setOpenTpl] = useState(false);
  const [openEdit, setOpenEdit] = useState<Meta | null>(null);
  const [deleteMeta, setDeleteMeta] = useState<Meta | null>(null);

  const [datasets, setDatasets] = useState<Meta[]>([]);
  const [indicators, setIndicators] = useState<Record<string, IndicatorLite>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

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
      const { data: ind } = await supabase
        .from("indicator_catalogue")
        .select("id,name,data_type,theme")
        .in("id", ids);
      const map: Record<string, IndicatorLite> = {};
      (ind || []).forEach((i) => (map[i.id] = i));
      setIndicators(map);
    } else setIndicators({});
  };

  useEffect(() => { loadAll(); }, [countryIso]);

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

  const loadValues = async (id: string) => {
    setSelected(id);
    setLoadingPreview(true);
    const { data } = await supabase
      .from("dataset_values")
      .select("admin_pcode,value,unit")
      .eq("dataset_id", id)
      .limit(500);
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
          <button
            onClick={() => setOpenTpl(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-blue)] hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90"
          >
            + Add Dataset
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-3 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-2 py-1">Title</th>
              <th className="text-left px-2 py-1">Indicator</th>
              <th className="text-left px-2 py-1">Type</th>
              <th className="text-left px-2 py-1">Admin Level</th>
              <th className="text-left px-2 py-1">Data Type</th>
              <th className="text-left px-2 py-1">Source</th>
              <th className="text-left px-2 py-1">Created</th>
              <th className="text-right px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => {
              const ind = d.indicator_id ? indicators[d.indicator_id] : null;
              return (
                <tr
                  key={d.id}
                  onClick={() => loadValues(d.id)}
                  className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                    selected === d.id ? "font-semibold bg-gray-100" : ""
                  }`}
                >
                  <td className="px-2 py-1">{d.title}</td>
                  <td className="px-2 py-1">{ind ? ind.name : "—"}</td>
                  <td className="px-2 py-1">{d.upload_type || "—"}</td>
                  <td className="px-2 py-1">{d.admin_level || "—"}</td>
                  <td className="px-2 py-1">{ind?.data_type || "—"}</td>
                  <td className="px-2 py-1">{parseSource(d.source)}</td>
                  <td className="px-2 py-1">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-2 py-1">
                    <div className="flex justify-end gap-2">
                      <button className="p-1 rounded hover:bg-gray-100" title="Preview" onClick={() => loadValues(d.id)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100" title="Edit" onClick={() => setOpenEdit(d)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100 text-[color:var(--gsc-red)]"
                        title="Delete"
                        onClick={() => setDeleteMeta(d)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {selected && (
        <div className="mt-4 border rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="font-semibold">
              Dataset Preview — {datasets.find((d) => d.id === selected)?.title}
            </div>
            <button className="text-sm underline" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          {loadingPreview ? (
            <div className="p-6 text-sm text-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-2 py-1">Admin PCode</th>
                    <th className="text-left px-2 py-1">Value</th>
                    <th className="text-left px-2 py-1">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={`${r.admin_pcode}-${i}`} className="border-b last:border-b-0">
                      <td className="px-2 py-1">{r.admin_pcode}</td>
                      <td className="px-2 py-1">{r.value ?? "—"}</td>
                      <td className="px-2 py-1">{r.unit ?? "—"}</td>
                    </tr>
                  ))}
                  {!previewRows.length && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-gray-500">
                        No rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          countryIso={countryIso}
          onClose={() => setOpenAdd(false)}
          onCreated={loadAll}
        />
      )}
      {openEdit && (
        <EditDatasetModal
          open={!!openEdit}
          dataset={openEdit}
          onClose={() => setOpenEdit(null)}
          onSave={loadAll}
        />
      )}
      {openTpl && (
        <TemplateDownloadModal
          open={openTpl}
          onClose={() => setOpenTpl(false)}
          countryIso={countryIso}
        />
      )}
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
