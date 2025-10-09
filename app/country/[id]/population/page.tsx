"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Database, Upload, Trash2, Edit3, Download, CheckCircle2 } from "lucide-react";

export default function PopulationPage({ params }: { params: { id: string } }) {
  const countryIso = params.id.toUpperCase();
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ count: number; total: number }>({
    count: 0,
    total: 0,
  });

  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<null | any>(null);
  const [openDelete, setOpenDelete] = useState<null | any>(null);

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  async function loadVersions() {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVersions(data);
      const active = data.find((v) => v.is_active) || data[0] || null;
      setSelectedVersion(active);
    }
  }

  async function fetchRows(versionId: string) {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("dataset_version_id", versionId)
      .limit(1000);

    if (!error && data) setRows(data);
  }

  useEffect(() => {
    if (selectedVersion) {
      fetchRows(selectedVersion.id);
      fetchMetrics(selectedVersion.id);
    }
  }, [selectedVersion]);

  async function fetchMetrics(versionId: string) {
    const { data, error } = await supabase
      .from("population_data")
      .select("population", { count: "exact" })
      .eq("dataset_version_id", versionId);

    if (!error && data) {
      const total = data.reduce(
        (sum: number, row: any) => sum + (row.population || 0),
        0
      );
      setMetrics({ count: data.length, total });
    }
  }

  async function handleDeleteVersion(versionId: string) {
    await supabase.from("population_data").delete().eq("dataset_version_id", versionId);
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    loadVersions();
  }

  const handleTemplateDownload = async () => {
    try {
      const headers = ["pcode", "population", "name", "year"];
      const csv = headers.join(",") + "\n";
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "population_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Template download failed:", e);
    }
  };

  const headerProps = {
    title: `${countryIso} – Population Data`,
    group: "country-config" as const,
    description:
      "Upload and manage versioned population datasets aligned with administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* 📦 Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleTemplateDownload}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-blue-50 text-blue-700"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th>Year</th>
                <th>Date</th>
                <th>Source</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    v.is_active ? "bg-green-50" : ""
                  }`}
                >
                  <td
                    onClick={() => setSelectedVersion(v)}
                    className={`border px-2 py-1 cursor-pointer ${
                      selectedVersion?.id === v.id ? "font-bold" : ""
                    }`}
                  >
                    {v.title}
                  </td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{formatDate(v.dataset_date)}</td>
                  <td className="border px-2 py-1">{v.source ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-gray-700 hover:underline text-xs flex items-center"
                        onClick={() => setOpenEdit(v)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                        onClick={() => setOpenDelete(v)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No population dataset versions uploaded yet.
          </p>
        )}
      </div>

      {/* 📊 Dataset Health */}
      {selectedVersion && (
        <div className="border rounded-lg p-4 shadow-sm bg-white space-y-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-red)]">
            {selectedVersion.title}
          </h3>
          <p className="text-sm text-gray-700">
            Records: <strong>{metrics.count}</strong> | Total Population:{" "}
            <strong>{metrics.total.toLocaleString()}</strong>
          </p>
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 text-sm">Population Records</h4>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No population data uploaded.
              </p>
            ) : (
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-2 py-1">PCode</th>
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-right px-2 py-1">Population</th>
                    <th className="text-center px-2 py-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1">{r.pcode}</td>
                      <td className="px-2 py-1">{r.name || "—"}</td>
                      <td className="text-right px-2 py-1">
                        {r.population?.toLocaleString() || "—"}
                      </td>
                      <td className="text-center px-2 py-1">{r.year || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 🧱 Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={loadVersions}
      />
      <EditPopulationVersionModal
        open={!!openEdit}
        onClose={() => setOpenEdit(null)}
        versionId={openEdit?.id || null}
        countryIso={countryIso}
        onSaved={loadVersions}
      />
      <ConfirmDeleteModal
        open={!!openDelete}
        onClose={() => setOpenDelete(null)}
        message="Are you sure you want to delete this dataset?"
        onConfirm={() => handleDeleteVersion(openDelete?.id)}
      />
    </SidebarLayout>
  );
}
