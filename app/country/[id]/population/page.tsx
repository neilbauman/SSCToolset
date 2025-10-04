"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Users } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date: string | null;
  source: string | null;
  created_at: string;
  is_active: boolean;
  notes?: string;
  lowest_level?: string;
  completeness?: number;
  is_joined?: boolean;
  is_archived?: boolean;
};

type PopulationRow = {
  id: string;
  pcode: string;
  population: number;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);

  const fetchVersions = async () => {
    const { data } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (data) {
      setVersions(data as PopulationVersion[]);
      const active = data.find((v) => v.is_active);
      if (active) {
        setActiveVersion(active);
        fetchRows(active.id);
      }
    }
  };

  const fetchRows = async (versionId: string) => {
    const { data } = await supabase
      .from("population_data")
      .select("id, pcode, population")
      .eq("dataset_version_id", versionId);

    if (data) setRows(data as PopulationRow[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleMakeActive = async (versionId: string) => {
    await supabase.from("population_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("population_dataset_versions").update({ is_active: true }).eq("id", versionId);
    fetchVersions();
  };

  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    fetchVersions();
  };

  const handleSelectVersion = (v: PopulationVersion) => {
    setActiveVersion(v);
    fetchRows(v.id);
  };

  const headerProps = {
    title: `Population – ${countryIso}`,
    group: "country-config" as const,
    description: "Manage census population datasets and demographic indicators.",
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
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            Upload Dataset
          </button>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Title</th>
              <th className="border px-2 py-1">Year</th>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Source</th>
              <th className="border px-2 py-1">Badges</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className={activeVersion?.id === v.id ? "bg-blue-50" : ""}>
                <td className="border px-2 py-1">{v.title}</td>
                <td className="border px-2 py-1">{v.year}</td>
                <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                <td className="border px-2 py-1">{v.source || "—"}</td>
                <td className="border px-2 py-1">
                  {v.is_active && <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Active</span>}
                  {v.is_joined && <span className="ml-1 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">Joined</span>}
                  {v.is_archived && <span className="ml-1 px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">Archived</span>}
                </td>
                <td className="border px-2 py-1 space-x-2">
                  <button onClick={() => handleSelectVersion(v)} className="text-blue-600 hover:underline">Select</button>
                  {!v.is_active && (
                    <button onClick={() => handleMakeActive(v.id)} className="text-green-600 hover:underline">
                      Make Active
                    </button>
                  )}
                  <button onClick={() => setOpenEdit(v)} className="text-gray-600 hover:underline">Edit</button>
                  <button onClick={() => setOpenDelete(v)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rows */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Population Data {activeVersion ? `– ${activeVersion.title}` : ""}</h2>
        {rows.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">PCode</th>
                <th className="border px-2 py-1">Population</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.population}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">No population data uploaded</p>
        )}
      </div>

      <UploadPopulationModal open={openUpload} onClose={() => setOpenUpload(false)} countryIso={countryIso} onUploaded={fetchVersions} />

      <EditPopulationVersionModal open={!!openEdit} onClose={() => setOpenEdit(null)} version={openEdit} onUpdated={fetchVersions} />

      <ConfirmDeleteModal
        open={!!openDelete}
        onClose={() => setOpenDelete(null)}
        onConfirm={() => {
          if (openDelete) handleDeleteVersion(openDelete.id);
          setOpenDelete(null);
        }}
        message="Are you sure you want to delete this population dataset version? This cannot be undone."
      />
    </SidebarLayout>
  );
}
