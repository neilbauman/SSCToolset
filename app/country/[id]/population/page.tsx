"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";

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
    fetchVersions();
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      fetchRows(selectedVersion.id);
      fetchMetrics(selectedVersion.id);
    }
  }, [selectedVersion]);

  async function fetchVersions() {
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
    fetchVersions();
  }

  const handleDownloadTemplate = () => {
    const headers = ["pcode", "population", "name", "year"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Population_Template_v1.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="flex flex-col h-full">
      {/* 🧭 Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population Data" },
        ]}
      />

      {/* 🧱 Header */}
      <PageHeader
        title={`Population Data – ${countryIso}`}
        description="Upload and manage versioned population datasets aligned with administrative boundaries."
        group="Country-config"
      />

      {/* 🧩 Action Buttons */}
      <div className="flex justify-end mt-3 mb-2 gap-2">
        <Button
          className="border px-3 py-1 text-sm rounded hover:bg-gray-50"
          onClick={handleDownloadTemplate}
        >
          Download Template
        </Button>
        <Button
          className="px-3 py-1 text-sm bg-red-700 hover:bg-red-800 text-white rounded"
          onClick={() => setOpenUpload(true)}
        >
          Upload Dataset
        </Button>
      </div>

      {/* 📅 Active Version Info */}
      {selectedVersion && (
        <div className="mb-4 text-sm text-gray-600 flex items-center gap-4">
          <div>
            <span className="font-medium text-gray-800">Active Version:</span>{" "}
            {selectedVersion.title} ({selectedVersion.year || "—"})
          </div>
          <div>
            <span className="font-medium text-gray-800">Last Updated:</span>{" "}
            {formatDate(selectedVersion.created_at)}
          </div>
        </div>
      )}

      {/* 📦 Versions Table */}
      <div className="border rounded-md bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Dataset Versions</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-1">Title</th>
              <th>Year</th>
              <th>Date</th>
              <th>Source</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`border-b hover:bg-gray-50 ${
                  selectedVersion?.id === v.id ? "bg-gray-100" : ""
                }`}
              >
                <td
                  className="cursor-pointer py-1"
                  onClick={() => setSelectedVersion(v)}
                >
                  {v.title}
                </td>
                <td className="text-center">{v.year || "—"}</td>
                <td className="text-center">{formatDate(v.dataset_date)}</td>
                <td className="text-center">{v.source || "—"}</td>
                <td className="text-center">
                  {v.is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right space-x-1">
                  <Button
                    className="px-2 py-1 text-xs border rounded"
                    onClick={() => setOpenEdit(v)}
                  >
                    Edit
                  </Button>
                  <Button
                    className="px-2 py-1 text-xs border rounded"
                    onClick={() => setOpenDelete(v)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📊 Dataset Health */}
      {selectedVersion && (
        <div className="mt-6 border rounded-md bg-white p-4 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold">
            Dataset Health – {selectedVersion.title}
          </h3>
          <p className="text-sm">
            Records: <strong>{metrics.count}</strong> | Total Population:{" "}
            <strong>{metrics.total.toLocaleString()}</strong>
          </p>
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 text-sm">
              Population Records — {selectedVersion.title}
            </h4>
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
        onUploaded={fetchVersions}
      />
      <EditPopulationVersionModal
        open={!!openEdit}
        onClose={() => setOpenEdit(null)}
        versionId={openEdit?.id || null}
        countryIso={countryIso}
        onSaved={fetchVersions}
      />
      <ConfirmDeleteModal
        open={!!openDelete}
        onClose={() => setOpenDelete(null)}
        message="Are you sure you want to delete this dataset?"
        onConfirm={() => handleDeleteVersion(openDelete?.id)}
      />
    </div>
  );
}
