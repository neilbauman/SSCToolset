"use client";
import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { PlusCircle, Download, Eye, Edit3, Trash2 } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import type { GroupKey } from "@/components/layout/SidebarLayout";

type DatasetMeta = {
  id: string;
  title: string;
  description: string | null;
  source_name: string | null;
  source_url: string | null;
  year: number | null;
  data_type: string | null;
  dataset_type: string | null;
  admin_level: string | null;
  record_count: number | null;
  indicator_id: string | null;
  created_at: string;
};

export default function DatasetsPage({ params }: { params: { id: string } }) {
  const countryIso = params.id.toUpperCase();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<DatasetMeta | null>(null);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [dataRows, setDataRows] = useState<any[]>([]);

  const headerProps = {
    title: "Other Datasets",
    group: "country-config" as GroupKey,
    description:
      "Upload and manage additional datasets such as national statistics or gradient indicators.",
    breadcrumbs: <Breadcrumbs items={[{ label: "Other Datasets" }]} />,
  };

  useEffect(() => { load(); }, [countryIso]);
  async function load() {
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) setDatasets(data);
  }

  async function loadValues(id: string) {
    setSelected(id);
    const { data, error } = await supabase
      .from("dataset_values")
      .select("admin_pcode,value,unit")
      .eq("dataset_id", id);
    if (!error && data) setDataRows(data);
  }

  async function delDataset(id: string) {
    if (!confirm("Delete this dataset and all values?")) return;
    const { error } = await supabase.from("dataset_metadata").delete().eq("id", id);
    if (!error) { setSelected(null); load(); }
  }

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setOpenAdd(true)}
            className="bg-[color:var(--gsc-red)] text-white px-3 py-2 rounded-md flex items-center gap-1 text-sm"
          >
            <PlusCircle className="w-4 h-4" /> Add Dataset
          </button>
          <button
            onClick={() => setOpenTemplate(true)}
            className="border border-gray-300 text-sm px-3 py-2 rounded-md flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2">Year</th>
              <th className="p-2">Type</th>
              <th className="p-2">Admin</th>
              <th className="p-2">Source</th>
              <th className="p-2">Records</th>
              <th className="p-2 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr
                key={d.id}
                onClick={() => loadValues(d.id)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selected === d.id ? "font-semibold bg-gray-100" : ""
                }`}
              >
                <td className="p-2">{d.title}</td>
                <td className="p-2 text-center">{d.year || "—"}</td>
                <td className="p-2 text-center">{d.data_type || "—"}</td>
                <td className="p-2 text-center">{d.admin_level || "—"}</td>
                <td className="p-2 text-center">
                  {d.source_name ? (
                    <a
                      href={d.source_url || "#"}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      {d.source_name}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 text-center">{d.record_count ?? "—"}</td>
                <td className="p-2 flex justify-center gap-2">
                  <button onClick={() => loadValues(d.id)}>
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => setOpenEdit(d)}>
                    <Edit3 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button onClick={() => delDataset(d.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
            {!datasets.length && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No datasets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-gray)] mb-2">
            Dataset Values ({dataRows.length})
          </h3>
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-2 text-left">Admin Pcode</th>
                  <th className="p-2 text-left">Value</th>
                  <th className="p-2 text-left">Unit</th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2">{r.admin_pcode}</td>
                    <td className="p-2">{r.value}</td>
                    <td className="p-2">{r.unit || "—"}</td>
                  </tr>
                ))}
                {!dataRows.length && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-500">
                      No data values available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddDatasetModal open={openAdd} onClose={() => setOpenAdd(false)} onCreated={load} />
      <EditDatasetModal
        open={!!openEdit}
        dataset={openEdit}
        onClose={() => setOpenEdit(null)}
        onSave={load}
      />
      <TemplateDownloadModal open={openTemplate} onClose={() => setOpenTemplate(false)} />
    </SidebarLayout>
  );
}
