"use client";
import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Download, PlusCircle, Trash2, Edit2, Loader2 } from "lucide-react";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import type { CountryParams } from "@/app/country/types";

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<any>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [downloadChoice, setDownloadChoice] = useState<{ open: boolean }>({ open: false });

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const loadDatasets = async () => {
    setLoading(true);
    const { data: c } = await supabase.from("countries").select("*").eq("iso_code", countryIso).maybeSingle();
    setCountry(c);

    const { data: d } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    setDatasets(d || []);
    setLoading(false);
  };

  const handleDeleteDataset = async (id: string) => {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setOpenDelete(null);
    await loadDatasets();
  };

  const downloadTemplate = async (prefill: boolean) => {
    setDownloadChoice({ open: false });

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        indicator_code: "POV_RATE", // fallback demo indicator, will override when used in AddDataset
        country_iso: countryIso,
        prefill,
      }),
    });

    if (!res.ok) {
      alert("Template generation failed");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dataset_template_${countryIso}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Other Datasets`,
    group: "country-config" as const,
    description: "Manage and upload non-core datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top bar */}
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Datasets</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setDownloadChoice({ open: true })}
            className="flex items-center bg-gray-200 text-sm px-3 py-1 rounded hover:bg-gray-300"
          >
            <Download className="w-4 h-4 mr-1" /> Download Template
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1 rounded hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Dataset
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="animate-spin w-4 h-4" /> Loading datasets...
        </div>
      ) : datasets.length === 0 ? (
        <p className="italic text-gray-500 text-sm">No datasets added yet.</p>
      ) : (
        <table className="w-full text-sm border rounded bg-white shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Theme</th>
              <th className="px-2 py-1 text-left">Admin Level</th>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Created</th>
              <th className="px-2 py-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((ds) => (
              <tr key={ds.id} className="border-t hover:bg-gray-50">
                <td className="px-2 py-1">{ds.title || "—"}</td>
                <td className="px-2 py-1">{ds.theme || "—"}</td>
                <td className="px-2 py-1">{ds.admin_level || "—"}</td>
                <td className="px-2 py-1">
                  {(() => {
                    try {
                      const src = ds.source ? JSON.parse(ds.source) : null;
                      return src?.url ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {src.name || "Source"}
                        </a>
                      ) : (
                        src?.name || "—"
                      );
                    } catch {
                      return "—";
                    }
                  })()}
                </td>
                <td className="px-2 py-1">{new Date(ds.created_at).toLocaleDateString()}</td>
                <td className="px-2 py-1 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setOpenEdit(ds)}
                      className="text-blue-600 text-xs flex items-center hover:underline"
                    >
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => setOpenDelete(ds)}
                      className="text-[color:var(--gsc-red)] text-xs flex items-center hover:underline"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Download Template Modal */}
      {downloadChoice.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Download Template</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose whether to prefill the template with admin PCodes and names.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => downloadTemplate(false)}
                className="px-3 py-1 text-sm border rounded"
              >
                Empty
              </button>
              <button
                onClick={() => downloadTemplate(true)}
                className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded"
              >
                Prefilled
              </button>
              <button
                onClick={() => setDownloadChoice({ open: false })}
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onUploaded={loadDatasets}
        />
      )}

      {openEdit && (
        <EditDatasetModal
          open={true}
          dataset={openEdit}
          onClose={() => setOpenEdit(null)}
          onUpdated={loadDatasets}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={true}
          message={`This will permanently remove "${openDelete.title}".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteDataset(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}
