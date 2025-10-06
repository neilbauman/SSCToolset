"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import { Database, Upload, FileDown, Map, MoreVertical } from "lucide-react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type GISVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  lowest_level: string | null;
  completeness: number | null;
  is_active: boolean | null;
  created_at: string;
};

type GISDataset = {
  id: string;
  name: string;
  geojson: any;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<GISVersion | null>(null);
  const [openDelete, setOpenDelete] = useState<GISVersion | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const [geojsonData, setGeojsonData] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // --- Handle outside click for actions dropdown ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Fetch country metadata ---
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

  // --- Fetch version list ---
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching GIS versions:", error);
      return;
    }

    const list = (data ?? []) as GISVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
    if (initial) fetchGeojson(initial.id);
  };

  // --- Fetch GeoJSON for active version ---
  const fetchGeojson = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_datasets")
      .select("id, name, geojson")
      .eq("dataset_version_id", versionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching GIS dataset:", error);
      setGeojsonData(null);
      return;
    }

    setGeojsonData(data?.geojson || null);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // --- Header props for SidebarLayout ---
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS`,
    group: "country-config" as const,
    description: "Manage GIS datasets and visualize uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // --- Make version active ---
  const handleMakeActive = async (versionId: string) => {
    await supabase.from("gis_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("gis_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
  };

  // --- Delete version (and related data) ---
  const handleDeleteVersion = async (versionId: string) => {
    const { data: ds } = await supabase.from("gis_datasets").select("id").eq("dataset_version_id", versionId);

    const datasetIds = (ds ?? []).map((d) => d.id);
    if (datasetIds.length) {
      await supabase.from("gis_datasets").delete().in("id", datasetIds);
    }

    await supabase.from("gis_dataset_versions").delete().eq("id", versionId);
    setOpenDelete(null);
    await fetchVersions();
  };

  // --- Actions menu for each version ---
  const ActionsMenu = ({ v }: { v: GISVersion }) => {
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
                  fetchGeojson(v.id);
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

  // --- Download template ---
  const downloadTemplate = () => {
    const csv = "ADM1 Name,ADM1 PCode,ADM2 Name,ADM2 PCode,...\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Country_Config_GIS_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Versions Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> GIS Dataset Versions
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
          <p className="italic text-gray-500">No GIS versions uploaded yet</p>
        )}
      </div>

      {/* --- Dataset Health --- */}
      <DatasetHealth totalUnits={geojsonData ? geojsonData.features?.length ?? 0 : 0} />

      {/* --- Map Preview --- */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <h2 className="text-lg font-semibold mb-3">
          GIS Preview {selectedVersion?.title ? `– ${selectedVersion.title}` : ""}
        </h2>

        <MapContainer
          center={[12.8797, 121.774]} // Philippines default
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          className="rounded-md z-0"
          whenReady={() => {
            console.log("Map ready");
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          {geojsonData && <GeoJSON data={geojsonData} />}
        </MapContainer>
      </div>

      {/* --- Modals --- */}
      <UploadGISModal
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
          message={`This will permanently remove the version "${openDelete.title ?? ""}" and all associated GIS data. This cannot be undone.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={async () => {
            await handleDeleteVersion(openDelete.id);
          }}
        />
      )}
    </SidebarLayout>
  );
}
