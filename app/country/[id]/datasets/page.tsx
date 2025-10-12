"use client";
import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { PlusCircle, FileDown, Edit3, Trash2, Loader2 } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import type { CountryParams } from "@/app/country/types";

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id.toUpperCase();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [values, setValues] = useState<any[]>([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [openDelete, setOpenDelete] = useState<any | null>(null);
  const [openTemplate, setOpenTemplate] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) setDatasets(data);
  };

  const loadValues = async (datasetId: string) => {
    setLoadingValues(true);
    const { data, error } = await supabase
      .from("dataset_values")
      .select("admin_pcode, value, unit")
      .eq("dataset_id", datasetId)
      .limit(1000);
    if (!error && data) {
      const joined = await Promise.all(
        data.map(async (r) => {
          const { data: a } = await supabase
            .from("admin_units")
            .select("name")
            .eq("pcode", r.admin_pcode)
            .maybeSingle();
          return { ...r, name: a?.name || "—" };
        })
      );
      setValues(joined);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
    setLoadingValues(false);
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dataset_metadata").delete().eq("id", id);
    if (!error) {
      setOpenDelete(null);
      loadDatasets();
      setSelected(null);
    }
  };

  const headerProps = {
    title: "Other Datasets",
    group: "datasets" as const,
    description:
      "Upload and manage additional datasets such as national statistics or gradient indicators.",
    breadcrumbs: <Breadcrumbs items={[{ label: "Other Datasets" }]} />, // ✅ FIXED — required items prop
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[color:var(--gsc-red)] text-white text-sm hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4" /> Add Dataset
          </button>
          <button
            onClick={() => setOpenTemplate(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[color:var(--gsc-blue)] text-white text-sm hover:opacity-90"
          >
            <FileDown className="w-4 h-4" /> Download Template
          </button>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">
            <tr>
              {["Title", "Year", "Admin Level", "Type", "Data Type", "Source", "Actions"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => {
              const active = selected?.id === d.id;
              return (
                <tr
                  key={d.id}
                  onClick={() => {
                    setSelected(d);
                    loadValues(d.id);
                  }}
                  className={`border-t cursor-pointer hover:bg-[color:var(--gsc-beige)] ${
                    active ? "font-semibold bg-[color:var(--gsc-beige)]" : ""
                  }`}
                >
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="px-3 py-2">{d.year || "—"}</td>
                  <td className="px-3 py-2">{d.admin_level}</td>
                  <td className="px-3 py-2">{d.dataset_type}</td>
                  <td className="px-3 py-2">{d.data_type}</td>
                  <td className="px-3 py-2">{d.source_name || "—"}</td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenEdit(d);
                      }}
                    >
                      <Edit3 className="w-4 h-4 text-gray-600 hover:text-[color:var(--gsc-blue)]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDelete(d);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-[color:var(--gsc-red)]" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!datasets.length && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-6">
                  No datasets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Data Preview */}
      {selected && (
        <div ref={previewRef} className="mt-6 border rounded-lg bg-white shadow-sm">
          <div className="px-4 py-2 border-b flex justify-between items-center bg-[color:var(--gsc-beige)]">
            <h3 className="font-semibold text-[color:var(--gsc-gray)]">
              Data Preview: {selected.title}
            </h3>
            {loadingValues && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  {["Name", "PCode", "Value", "Unit"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {values.map((v, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{v.name}</td>
                    <td className="px-3 py-2">{v.admin_pcode}</td>
                    <td className="px-3 py-2">{v.value ?? "—"}</td>
                    <td className="px-3 py-2">{v.unit ?? "—"}</td>
                  </tr>
                ))}
                {!values.length && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-6">
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onCreated={loadDatasets}
        />
      )}
      {openEdit && (
        <EditDatasetModal
          open={!!openEdit}
          dataset={openEdit}
          onClose={() => setOpenEdit(null)}
          onSave={loadDatasets}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          title="Delete Dataset"
          message={`Are you sure you want to delete "${openDelete.title}"?`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}
      {openTemplate && (
        <TemplateDownloadModal open={openTemplate} onClose={() => setOpenTemplate(false)} />
      )}
    </SidebarLayout>
  );
}
