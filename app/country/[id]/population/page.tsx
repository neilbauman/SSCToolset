"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import { Database, Upload, FileDown, MoreVertical } from "lucide-react";
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

type PopulationVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  population: number | null;
  name?: string | null;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);

  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<PopulationVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);

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

  // Fetch country metadata
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

  // Fetch all versions
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

    const list = (data ?? []) as PopulationVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
    if (initial) fetchRows(initial.id);
    else setRows([]);
  };

  // Fetch population rows for selected version
  const fetchRows = async (versionId: string) => {
    const { data: ds, error: dsErr } = await supabase
      .from("population_datasets")
      .select("id")
      .eq("dataset_version_id", versionId)
      .maybeSingle();

    if (dsErr) {
      console.error("Error resolving dataset for version:", dsErr);
      setRows([]);
      return;
    }

    const datasetId = ds?.id;
    if (!datasetId) {
      setRows([]);
      return;
    }

    const { data, error } = await supabase
      .from("population_data")
      .select("id,pcode,population,name")
      .eq("dataset_id", datasetId)
      .order("pcode", { ascending: true });

    if (error) {
      console.error("Error fetching population rows:", error);
      setRows([]);
      return;
    }

    setRows((data ?? []) as PopulationRow[]);
  };

  // Initial load
  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // Header configuration for SidebarLayout
  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage population datasets and inspect uploaded records.",
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

  // Select version handler
  const handleSelectVersion = (v: PopulationVersion) => {
    setSelectedVersion(v);
    fetchRows(v.id);
  };

  // Activate version
  const handleMakeActive = async (versionId: string) => {
    await supabase.from("population_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("population_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
  };

  // Delete version and related data
  const handleDeleteVersion = async (versionId: string) => {
    const { data: ds } = await supabase
      .from("population_datasets")
      .select("id")
      .eq("dataset_version_id", versionId);

    const datasetIds = (ds ?? []).map((d) => d.id);
    if (datasetIds.length) {
      await supabase.from("population_data").delete().in("dataset_id", datasetIds);
      await supabase.from("population_datasets").delete().in("id", datasetIds);
    }

    await supabase.from("population_dataset_versions").delete().eq("id", versionId);
    setOpenDelete(null);
    await fetchVersions();
  };

  // Download CSV template
  const downloadTemplate = () => {
    const csv = "pcode,population\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Country_Config_Population_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRecords = rows.length;

  // Inline menu for each version
  const ActionsMenu = ({ v }: { v: PopulationVersion }) => {
    const isSelected = selectedVersion?.id === v.id;
    const isActive = !!v.is_active;

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
                  handleSelectVersion(v);
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
                setOpenEdit(v);
                setOpenMenuFor(null);
              }}
            >
              Edit
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpenDelete(v);
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
      {/* --- Versions Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
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
                const isSelected = selectedVersion?.id === v.id;
                const isActive = !!v.is_active;
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
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          —
                        </span>
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
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* --- Dataset Health --- */}
      <DatasetHealth totalUnits={totalRecords} />

      {/* --- Population Records --- */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <h2 className="text-lg font-semibold mb-3">
          Population Records {selectedVersion?.title ? `– ${selectedVersion.title}` : ""}
        </h2>

        {rows.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">PCode</th>
                <th className="border px-2 py-1 text-left">Population</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.name ?? "—"}</td>
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">
                    {typeof r.population === "number" ? r.population.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No population data uploaded</p>
        )}
      </div>

      {/* --- Modals --- */}
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
          onSave={async () => {
            await fetchVersions();
            setOpenEdit(null);
          }}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove the version "${openDelete.title ?? ""}" and all related data. This cannot be undone.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={async () => {
            await handleDeleteVersion(openDelete.id);
          }}
        />
      )}
    </SidebarLayout>
  );
}
