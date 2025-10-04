"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database } from "lucide-react";
import UploadPopulationDatasetModal from "@/components/country/UploadPopulationDatasetModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type CountryParams = { id: string };

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  is_active: boolean;
  created_at: string;
};

type PopulationRecord = {
  id: string;
  pcode: string;
  population: number;
  name: string;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(
    null
  );
  const [records, setRecords] = useState<PopulationRecord[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);

  // Fetch versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      return;
    }
    setVersions(data as PopulationVersion[]);

    const active = data?.find((v: any) => v.is_active);
    if (active) {
      setActiveVersion(active);
      fetchRecords(active.id);
    }
  };

  // Fetch records for selected version
  const fetchRecords = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching population data:", error);
      return;
    }
    setRecords(data as PopulationRecord[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // Select a version
  const handleSelectVersion = (version: PopulationVersion) => {
    setActiveVersion(version);
    fetchRecords(version.id);
  };

  // Make a version active (only one allowed)
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

  // Delete a version
  const handleDeleteVersion = async (versionId: string) => {
    await supabase
      .from("population_dataset_versions")
      .delete()
      .eq("id", versionId);

    await supabase.from("population_data").delete().eq("dataset_version_id", versionId);

    fetchVersions();
  };

  const headerProps = {
    title: `Population Datasets`,
    group: "country-config" as const,
    description: "Manage population datasets for this country.",
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
      {/* Versions table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            Upload Dataset
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
                  <td className="border px-2 py-1">
                    {v.is_active && (
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-blue-600 hover:underline">
                        Actions
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {activeVersion?.id !== v.id && (
                          <DropdownMenuItem
                            onClick={() => handleSelectVersion(v)}
                          >
                            Select
                          </DropdownMenuItem>
                        )}
                        {!v.is_active && (
                          <DropdownMenuItem
                            onClick={() => handleMakeActive(v.id)}
                          >
                            Make Active
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setOpenEdit(v)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setOpenDelete(v)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* Records */}
      <div className="border rounded-lg p-4 shadow-sm">
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
                  <td className="border px-2 py-1">{r.population}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">
            {activeVersion
              ? "No records in this dataset"
              : "Select a version to view records"}
          </p>
        )}
      </div>

      {/* Modals */}
      <UploadPopulationDatasetModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
      {openEdit && (
        <EditPopulationVersionModal
          open={!!openEdit}
          onClose={() => setOpenEdit(null)}
          version={openEdit}
          onSave={fetchVersions}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
          message={`Are you sure you want to delete version "${openDelete.title}"? This cannot be undone.`}
        />
      )}
    </SidebarLayout>
  );
}
