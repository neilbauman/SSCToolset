"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Database, Upload, ChevronDown } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  is_active: boolean;
  created_at: string;
  completeness?: number;
  lowest_admin_level?: string;
  is_joined?: boolean;
  is_archived?: boolean;
};

type PopulationRecord = {
  id: string;
  pcode: string;
  name: string;
  population: number;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(null);
  const [records, setRecords] = useState<PopulationRecord[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fetch population dataset versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching population versions:", error);
      return;
    }

    setVersions(data as PopulationVersion[]);
    const active = data.find((v: any) => v.is_active);
    if (active) {
      setActiveVersion(active);
      fetchPopulation(active.id);
    }
  };

  // Fetch population data for active version
  const fetchPopulation = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_id", versionId);

    if (error) {
      console.error("Error fetching population data:", error);
      return;
    }

    setRecords(data as PopulationRecord[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleMakeActive = async (versionId: string) => {
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    fetchVersions();
  };

  const handleSelectVersion = (version: PopulationVersion) => {
    setActiveVersion(version);
    fetchPopulation(version.id);
  };

  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    await supabase.from("population_data").delete().eq("dataset_id", versionId);
    fetchVersions();
  };

  const headerProps = {
    title: `Population / Demographics`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population and demographic data.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population / Demographics" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Year</th>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Source</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    activeVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year}</td>
                  <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active && (
                      <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">
                        Active
                      </span>
                    )}
                    {v.is_joined && (
                      <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs ml-1">
                        Joined
                      </span>
                    )}
                    {v.is_archived && (
                      <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs ml-1">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center relative">
                    <button
                      onClick={() =>
                        setMenuOpenId(menuOpenId === v.id ? null : v.id)
                      }
                      className="flex items-center text-blue-600 hover:underline text-sm mx-auto"
                    >
                      Actions
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    {menuOpenId === v.id && (
                      <div className="absolute right-0 bg-white border rounded shadow-md mt-1 z-10 w-32 text-left">
                        {!v.is_active && (
                          <button
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-green-700"
                            onClick={() => handleMakeActive(v.id)}
                          >
                            Make Active
                          </button>
                        )}
                        {activeVersion?.id !== v.id && (
                          <button
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-blue-600"
                            onClick={() => handleSelectVersion(v)}
                          >
                            Select
                          </button>
                        )}
                        <button
                          className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-gray-700"
                          onClick={() => setOpenEdit(v)}
                        >
                          Edit
                        </button>
                        <button
                          className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-red-600"
                          onClick={() => setOpenDelete(v)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* Dataset Health */}
      <DatasetHealth totalUnits={records.length} />

      {/* Population Table */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <h2 className="text-lg font-semibold mb-3">Population Records</h2>
        {records.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">PCode</th>
                <th className="border px-2 py-1 text-left">Population</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.name}</td>
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.population.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No population data uploaded</p>
        )}
      </div>

      {/* Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
      {openEdit && (
        <EditPopulationVersionModal
          open
          onClose={() => setOpenEdit(null)}
          version={openEdit}
          onSave={fetchVersions}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open
          title="Delete Population Version"
          message={`Are you sure you want to delete "${openDelete.title}"? This will remove all associated population records.`}
          confirmLabel="Delete Permanently"
          onCancel={() => setOpenDelete(null)}
          onConfirm={() => {
            handleDeleteVersion(openDelete.id);
            setOpenDelete(null);
          }}
        />
      )}
    </SidebarLayout>
  );
}
