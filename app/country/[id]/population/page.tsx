"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  Upload,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Loader2,
} from "lucide-react";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source_name: string | null;
  source_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<PopulationVersion | null>(null);
  const [loading, setLoading] = useState(true);

  // 🧭 Fetch country info
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  // 📦 Load dataset versions with summary stats
  const loadVersions = async () => {
    setLoading(true);

    // Step 1: Fetch all population dataset versions for the country
    const { data: versionsData, error: versionsError } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (versionsError || !versionsData) {
      console.error("Error loading dataset versions:", versionsError);
      setLoading(false);
      return;
    }

    // Step 2: Call RPC function to fetch aggregated population stats
    const { data: aggData, error: aggError } = await supabase.rpc(
      "get_population_summary",
      { country_iso: countryIso }
    );

    if (aggError) {
      console.error("Error fetching population summary:", aggError);
    }

    // Step 3: Merge aggregation results with dataset versions
    const statsMap: Record<string, { total_population: number; record_count: number }> = {};
    if (aggData) {
      for (const row of aggData) {
        statsMap[row.dataset_version_id] = {
          total_population: Number(row.total_population || 0),
          record_count: Number(row.record_count || 0),
        };
      }
    }

    const merged = versionsData.map((v) => ({
      ...v,
      total_population: statsMap[v.id]?.total_population ?? 0,
      record_count: statsMap[v.id]?.record_count ?? 0,
    }));

    setVersions(merged);
    setSelectedVersion(merged.find((v) => v.is_active) || merged[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // 🗑 Delete version
  const handleDeleteVersion = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  // ✅ Activate version
  const handleActivateVersion = async (v: PopulationVersion) => {
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", v.id);
    await loadVersions();
  };

  // 📄 Template download
  const handleTemplateDownload = async () => {
    const fileUrl =
      "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/Population_Template.csv";
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Population_Template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Failed to download template file.");
    }
  };

  // 🧱 Header
  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Data`,
    group: "country-config" as const,
    description: "Manage versioned population datasets aligned with administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Loading Indicator */}
      {loading ? (
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading datasets...
        </div>
      ) : (
        <>
          {/* Dataset Versions Table */}
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
                  <Download className="w-4 h-4 mr-1" />
                  Template
                </button>
                <button
                  onClick={() => setOpenUpload(true)}
                  className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Dataset
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
                    <th>Total Population</th>
                    <th>Records</th>
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
                      <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                      <td className="border px-2 py-1">
                        {v.source_url ? (
                          <a
                            href={v.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {v.source_name}
                          </a>
                        ) : (
                          <span>{v.source_name ?? "—"}</span>
                        )}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {v.total_population.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {v.record_count.toLocaleString()}
                      </td>
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
                          {!v.is_active && (
                            <button
                              className="text-blue-600 hover:underline text-xs"
                              onClick={() => handleActivateVersion(v)}
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            className="text-gray-700 hover:underline text-xs flex items-center"
                            onClick={() => setEditingVersion(v)}
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

          {/* Modals */}
          {openUpload && (
            <UploadPopulationModal
              open={openUpload}
              onClose={() => setOpenUpload(false)}
              countryIso={countryIso}
              onUploaded={async () => loadVersions()}
            />
          )}
          {openDelete && (
            <ConfirmDeleteModal
              open={!!openDelete}
              message={`This will permanently remove version "${openDelete.title}".`}
              onClose={() => setOpenDelete(null)}
              onConfirm={() => handleDeleteVersion(openDelete.id)}
            />
          )}
          {editingVersion && (
            <EditPopulationVersionModal
              versionId={editingVersion.id}
              onClose={() => setEditingVersion(null)}
              onSaved={async () => {
                await loadVersions();
              }}
            />
          )}
        </>
      )}
    </SidebarLayout>
  );
}
