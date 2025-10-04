"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationDatasetModal from "@/components/country/UploadPopulationDatasetModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
};

type PopulationRecord = {
  id: string;
  pcode: string;
  name: string;
  population: number;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(null);
  const [populationRecords, setPopulationRecords] = useState<PopulationRecord[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
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
      console.error("Error fetching population versions:", error);
      return;
    }

    setVersions(data as PopulationVersion[]);
    const active = data?.find((v: any) => v.is_active);
    if (active) {
      setActiveVersion(active);
      fetchPopulationRecords(active.id);
    }
  };

  const fetchPopulationRecords = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching population records:", error);
      return;
    }
    setPopulationRecords(data as PopulationRecord[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleMakeActive = async (versionId: string) => {
    // Deactivate all other versions
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    // Activate the chosen one
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    fetchVersions();
  };

  const handleSelectVersion = (version: PopulationVersion) => {
    setActiveVersion(version);
    fetchPopulationRecords(version.id);
  };

  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    await supabase.from("population_data").delete().eq("dataset_version_id", versionId);
    setOpenDelete(null);
    fetchVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Data`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population Data" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Versions Table */}
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
                  <td className="border px-2 py-1 text-center">
                    {v.is_active && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-2 py-1 text-sm border rounded hover:bg-gray-50">
                          Actions
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {!v.is_active && (
                          <DropdownMenuItem onClick={() => handleMakeActive(v.id)}>
                            Make Active
                          </DropdownMenuItem>
                        )}
                        {activeVersion?.id !== v.id && (
                          <DropdownMenuItem onClick={() => handleSelectVersion(v)}>
                            Select
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
          <p className="italic text-gray-500">No population versions uploaded yet</p>
        )}
      </div>

      {/* Population Records Table */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <h2 className="text-lg font-semibold mb-3">Population Records</h2>
        {populationRecords.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">PCode</th>
                <th className="border px-2 py-1 text-left">Population</th>
              </tr>
            </thead>
            <tbody>
              {populationRecords.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{u.name}</td>
                  <td className="border px-2 py-1">{u.pcode}</td>
                  <td className="border px-2 py-1">{u.population}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No population records found</p>
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
          version={openEdit}
          onClose={() => setOpenEdit(null)}
          onSave={fetchVersions}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          onClose={() => setOpenDelete(null)}
          version={openDelete}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}
