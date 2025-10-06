"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import { Database, Layers, Upload, FileDown, MoreVertical } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label?: string;
  adm1_label?: string;
  adm2_label?: string;
  adm3_label?: string;
  adm4_label?: string;
  adm5_label?: string;
};

type DatasetVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function CountryPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DatasetVersion | null>(null);

  const [openUploadPop, setOpenUploadPop] = useState(false);
  const [openUploadGIS, setOpenUploadGIS] = useState(false);
  const [openEditVersion, setOpenEditVersion] = useState<DatasetVersion | null>(null);
  const [openDeleteVersion, setOpenDeleteVersion] = useState<DatasetVersion | null>(null);

  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch country info
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

  // Fetch dataset versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching dataset versions:", error);
      return;
    }

    const list = (data ?? []) as DatasetVersion[];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    setSelectedVersion(active || list[0] || null);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} — Configuration`,
    group: "country-config" as const,
    description: "Manage datasets, GIS layers, and population records for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso },
        ]}
      />
    ),
  };

  const handleMakeActive = async (versionId: string) => {
    await supabase.from("population_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("population_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
  };

  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    setOpenDeleteVersion(null);
    await fetchVersions();
  };

  const ActionsMenu = ({ v }: { v: DatasetVersion }) => {
    const isActive = !!v.is_active;
    const isSelected = selectedVersion?.id === v.id;

    return (
      <div className="relative" ref={menuRef}>
        <button
          className="text-blue-700 hover:underline flex items-center gap-1"
          onClick={() => setOpenMenuFor(openMenuFor === v.id ? null : v.id)}
        >
          Actions <MoreVertical className="w-4 h-4" />
        </button>

        {openMenuFor === v.id && (
          <div className="absolute right-0 mt-2 w-40 rounded border bg-white shadow z-10">
            {!isSelected && (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  setSelectedVersion(v);
                  setOpenMenuFor(null);
                }}
              >
                Select
              </button>
            )}
            {!isActive && (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={async () => {
                  await handleMakeActive(v.id);
                  setOpenMenuFor(null);
                }}
              >
                Make Active
              </button>
            )}
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                setOpenEditVersion(v);
                setOpenMenuFor(null);
              }}
            >
              Edit
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpenDeleteVersion(v);
                setOpenMenuFor(null);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Dataset Versions --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenUploadPop(true)}
              className="flex items-center text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Population
            </button>
            <button
              onClick={() => setOpenUploadGIS(true)}
              className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded hover:opacity-90"
            >
              <Layers className="w-4 h-4 mr-1" /> Add GIS Layer
            </button>
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const isActive = !!v.is_active;
                const isSelected = selectedVersion?.id === v.id;
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                    <td className="border px-2 py-1">{v.title || "—"}</td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                    <td className="border px-2 py-1">{v.source || "—"}</td>
                    <td className="border px-2 py-1">
                      {isActive ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">—</span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <ActionsMenu v={v} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No dataset versions found.</p>
        )}
      </div>

      {/* --- Dataset health panel --- */}
      <DatasetHealth totalUnits={versions.length} />

      {/* --- Modals --- */}
      <UploadPopulationModal
        open={openUploadPop}
        onClose={() => setOpenUploadPop(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />

      <UploadGISModal
        open={openUploadGIS}
        onClose={() => setOpenUploadGIS(false)}
        countryIso={countryIso}
        datasetVersionId={selectedVersion?.id || ""}
        onUploaded={() => window.location.reload()}
      />

      {openEditVersion && (
        <EditPopulationVersionModal
          open={!!openEditVersion}
          onClose={() => setOpenEditVersion(null)}
          version={openEditVersion}
          onSave={async () => {
            await fetchVersions();
            setOpenEditVersion(null);
          }}
        />
      )}

      {openDeleteVersion && (
        <ConfirmDeleteModal
          open={!!openDeleteVersion}
          message={`This will permanently remove "${openDeleteVersion.title ?? ""}" and related data.`}
          onClose={() => setOpenDeleteVersion(null)}
          onConfirm={async () => {
            await handleDeleteVersion(openDeleteVersion.id);
          }}
        />
      )}
    </SidebarLayout>
  );
}
