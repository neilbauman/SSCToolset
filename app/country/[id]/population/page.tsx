"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Upload, CheckCircle2, Trash2, Edit3, Download, Search, Loader2 } from "lucide-react";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import type { CountryParams } from "@/app/country/types";

// Inline types for this module
interface PopulationVersion {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  country_iso: string;
}

interface PopulationRow {
  id: string;
  pcode: string;
  name: string | null;
  population: number;
}

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [populationRows, setPopulationRows] = useState<PopulationRow[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<PopulationVersion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isFetchingRef = useRef(false);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Load population dataset versions
  const loadVersions = async () => {
    const { data } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (data) {
      setVersions(data);
      const active = data.find((v) => v.is_active) || data[0] || null;
      setSelectedVersion(active);
    }
  };

  // Load population data for selected version
  useEffect(() => {
    if (!selectedVersion || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoadingMsg("Loading population data...");
    setProgress(10);

    progressTimer.current = setInterval(
      () => setProgress((p) => Math.min(p + 5, 90)),
      200
    );

    supabase
      .from("population_data")
      .select("id, pcode, name, population")
      .eq("dataset_version_id", selectedVersion.id)
      .then(({ data }) => {
        setPopulationRows(data || []);
        setProgress(100);
        setLoadingMsg("");
      })
      .catch(() => setLoadingMsg("Failed to load data."))
      .finally(() => {
        isFetchingRef.current = false;
        if (progressTimer.current) clearInterval(progressTimer.current);
      });
  }, [selectedVersion]);

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // Delete version
  const handleDeleteVersion = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  // Activate version
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

  // Download template
  const handleTemplateDownload = async () => {
    try {
      const url =
        "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/Population_Template.csv";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Template not found");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Population_Template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Template download failed:", e);
      alert("Template not available.");
    }
  };

  // Filter and summarize
  const filteredRows = useMemo(() => {
    const t = searchTerm.toLowerCase();
    if (!t) return populationRows;
    return populationRows.filter(
      (r) =>
        r.name?.toLowerCase().includes(t) ||
        r.pcode.toLowerCase().includes(t)
    );
  }, [populationRows, searchTerm]);

  const totalPopulation = useMemo(
    () => filteredRows.reduce((a, b) => a + (b.population || 0), 0),
    [filteredRows]
  );

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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Progress bar */}
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      {/* Dataset versions */}
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
                <th>Records</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const isSel = selectedVersion?.id === v.id;
                let src: JSX.Element = <span>—</span>;
                if (v.source) {
                  try {
                    const j = JSON.parse(v.source);
                    src = j.url ? (
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {j.name || j.url}
                      </a>
                    ) : (
                      <span>{j.name}</span>
                    );
                  } catch {
                    src = <span>{v.source}</span>;
                  }
                }

                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${
                      v.is_active ? "bg-green-50" : ""
                    }`}
                  >
                    <td
                      onClick={() => setSelectedVersion(v)}
                      className={`border px-2 py-1 cursor-pointer ${
                        isSel ? "font-bold" : ""
                      }`}
                    >
                      {v.title}
                    </td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                    <td className="border px-2 py-1">{src}</td>
                    <td className="border px-2 py-1 text-center">
                      {
                        populationRows.filter(
                          (r) => r && selectedVersion?.id === v.id
                        ).length || 0
                      }
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
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No population datasets uploaded yet.
          </p>
        )}
      </div>

      {/* Summary + search */}
      <h2 className="text-xl font-bold text-[color:var(--gsc-red)] mb-2">
        {selectedVersion ? selectedVersion.title : "No Version Selected"}
      </h2>

      <div className="flex items-center mb-3 border rounded-lg px-2 py-1 w-full max-w-md bg-white">
        <Search className="w-4 h-4 text-gray-500 mr-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or PCode..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>

      <div className="border rounded-lg p-3 shadow-sm bg-white mb-6">
        <h3 className="text-sm font-semibold mb-2">Summary</h3>
        <p className="text-sm text-gray-700">
          <strong>Total Records:</strong> {filteredRows.length.toLocaleString()} <br />
          <strong>Total Population:</strong> {totalPopulation.toLocaleString()}
        </p>
      </div>

      {/* Preview table */}
      <div className="border rounded-lg p-4 shadow-sm bg-white">
        <h3 className="text-sm font-semibold mb-2">Sample Data (first 10 rows)</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">PCode</th>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-right">Population</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 10).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.pcode}</td>
                <td className="border px-2 py-1">{r.name || "—"}</td>
                <td className="border px-2 py-1 text-right">
                  {r.population.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          message={`This will permanently remove version \"${openDelete.title}\".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}

      {editingVersion && (
        <EditPopulationVersionModal
          versionId={editingVersion.id}
          onClose={() => setEditingVersion(null)}
          onSaved={loadVersions}
        />
      )}
    </SidebarLayout>
  );
}
