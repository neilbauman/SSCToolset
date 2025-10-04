"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Database, Upload, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  created_at: string;
  is_active: boolean;
  joined?: boolean;
  archived?: boolean;
};

type PopulationRecord = {
  id: string;
  name: string;
  pcode: string;
  population: number;
  dataset_version_id: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(null);
  const [records, setRecords] = useState<PopulationRecord[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

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
      fetchPopulation(active.id);
    }
  };

  const fetchPopulation = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching population:", error);
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
    await supabase.from("population_data").delete().eq("dataset_version_id", versionId);
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    fetchVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage and inspect population datasets for this country.",
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
                <th className="border px-2 py-1 text-center">Status</th>
                <th className="border px-2 py-1 text-center">Actions</th>
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
                    {v.is_active ? (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : v.archived ? (
                      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                        Archived
                      </span>
                    ) : v.joined ? (
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                        Joined
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleSelectVersion(v)}
                    >
                      Select
                    </button>
                    {!v.is_active && (
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => handleMakeActive(v.id)}
                      >
                        Make Active
                      </button>
                    )}
                    <button
                      className="text-gray-700 hover:underline"
                      onClick={() => setOpenEdit(v)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setOpenDelete(v)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* Data table */}
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
              ? "No records found for this version."
              : "Select or upload a dataset version to view records."}
          </p>
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
          open={!!openEdit}
          onClose={() => setOpenEdit(null)}
          version={openEdit}
          onSave={fetchVersions}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          onCancel={() => setOpenDelete(null)}
          onConfirm={() => {
            if (openDelete) handleDeleteVersion(openDelete.id);
            setOpenDelete(null);
          }}
          message={`Are you sure you want to delete "${openDelete?.title}"? This action cannot be undone.`}
        />
      )}
    </SidebarLayout>
  );
}
