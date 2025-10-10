"use client";

import { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, Trash2, Edit3, CheckCircle2, Database, Loader2, Download } from "lucide-react";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import type { CountryParams } from "@/app/country/types";

type PopulationVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
};

type PopulationRow = {
  pcode: string;
  name: string;
  population: number;
  year: number;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<PopulationVersion | null>(null);
  const [stats, setStats] = useState({ totalPop: 0, count: 0, year: null as number | null });

  const isFetchingRef = useRef(false);

  // 🔹 Load versions for this country
  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading versions:", error);
      return;
    }

    setVersions(data || []);
    const active = data?.find(v => v.is_active) || data?.[0] || null;
    setSelectedVersion(active);
  };

  // 🔹 Load sample population data
  const loadPopulationRows = async (versionId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setRows([]);

    const { data, error } = await supabase
      .from("population_data")
      .select("pcode, name, population, year")
      .eq("dataset_version_id", versionId)
      .limit(100);

    if (error) console.error("Error loading population data:", error);
    else setRows(data || []);

    // compute stats
    const total = data?.reduce((sum, r) => sum + Number(r.population || 0), 0) || 0;
    const year = data?.[0]?.year || null;
    setStats({ totalPop: total, count: data?.length || 0, year });

    setLoading(false);
    isFetchingRef.current = false;
  };

  // 🔹 Handle activation, deletion, and editing
  const handleActivate = async (v: PopulationVersion) => {
    await supabase.from("population_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("population_dataset_versions").update({ is_active: true }).eq("id", v.id);
    await loadVersions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const handleTemplateDownload = async () => {
    const url = "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/population_template.csv";
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "population_template.csv";
    link.click();
  };

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  useEffect(() => {
    if (selectedVersion) loadPopulationRows(selectedVersion.id);
  }, [selectedVersion]);

  // 🔹 Header + layout props
  const headerProps = {
    title: `${countryIso} – Population Data`,
    group: "country-config" as const,
    description: "Upload and manage population datasets for this country.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions Panel */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
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
              {versions.map(v => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}
                  onClick={() => setSelectedVersion(v)}
                >
                  <td className="border px-2 py-1 cursor-pointer">{v.title}</td>
                  <td className="border px-2 py-1 text-center">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">{v.source ?? "—"}</td>
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
                          onClick={e => {
                            e.stopPropagation();
                            handleActivate(v);
                          }}
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        className="text-gray-700 hover:underline text-xs flex items-center"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingVersion(v);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenDelete(v);
                        }}
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
          <p className="italic text-gray-500 text-sm">No population datasets uploaded yet.</p>
        )}
      </div>

      {/* Summary + Preview */}
      {selectedVersion && (
        <div className="border rounded-lg p-4 shadow-sm bg-white">
          <h2 className="text-lg font-semibold mb-2 text-[color:var(--gsc-red)]">
            {selectedVersion.title}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading data…
            </div>
          ) : (
            <>
              <p className="text-sm mb-2">
                Records: <strong>{stats.count}</strong> | Total Population:{" "}
                <strong>{stats.totalPop.toLocaleString()}</strong>{" "}
                {stats.year ? <>| Year: <strong>{stats.year}</strong></> : null}
              </p>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-2 py-1">PCode</th>
                      <th className="text-left px-2 py-1">Name</th>
                      <th className="text-right px-2 py-1">Population</th>
                      <th className="text-center px-2 py-1">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.pcode} className="hover:bg-gray-50">
                        <td className="px-2 py-1">{r.pcode}</td>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1 text-right">{r.population.toLocaleString()}</td>
                        <td className="px-2 py-1 text-center">{r.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {openUpload && (
        <UploadPopulationModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={loadVersions}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`Delete population dataset "${openDelete.title}"?`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}

      {editingVersion && (
        <EditPopulationVersionModal
          version={editingVersion}
          onClose={() => setEditingVersion(null)}
          onSaved={loadVersions}
        />
      )}
    </SidebarLayout>
  );
}
