"use client";

import { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import { Layers, Upload, MoreVertical } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types";

type GISDatasetVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
};

type Country = {
  iso_code: string;
  name: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] =
    useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const mapRef = useRef<any>(null);

  // Fetch country info
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch dataset versions
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

    const list = (data ?? []) as GISDatasetVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
    if (initial) fetchLayers(initial.id);
  };

  // Fetch layers for a version
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .order("admin_level", { ascending: true });

    if (error) {
      console.error("Error fetching GIS layers:", error);
      setLayers([]);
      return;
    }

    setLayers((data ?? []) as GISLayer[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleSelectVersion = (v: GISDatasetVersion) => {
    setSelectedVersion(v);
    fetchLayers(v.id);
  };

  const handleMakeActive = async (versionId: string) => {
    await supabase
      .from("gis_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("gis_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);
    await fetchVersions();
  };

  // Delete version
  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("gis_layers").delete().eq("dataset_version_id", versionId);
    await supabase.from("gis_dataset_versions").delete().eq("id", versionId);
    await fetchVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description:
      "Manage uploaded GIS datasets, their versions, and administrative boundary layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Versions Section --- */}
      <section className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Add GIS Version
          </button>
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
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
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
                    <td className="border px-2 py-1 relative">
                      <button
                        className="text-blue-700 hover:underline flex items-center gap-1"
                        onClick={() =>
                          setMenuOpenFor(
                            menuOpenFor === v.id ? null : v.id
                          )
                        }
                      >
                        Actions <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpenFor === v.id && (
                        <div className="absolute right-0 mt-2 w-40 rounded border bg-white shadow z-10">
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            onClick={() => {
                              handleSelectVersion(v);
                              setMenuOpenFor(null);
                            }}
                          >
                            Select
                          </button>
                          {!isActive && (
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              onClick={async () => {
                                await handleMakeActive(v.id);
                                setMenuOpenFor(null);
                              }}
                            >
                              Make Active
                            </button>
                          )}
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              await handleDeleteVersion(v.id);
                              setMenuOpenFor(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet.</p>
        )}
      </section>

      {/* --- Version Layers Section --- */}
      <section className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            Version Layers
          </h2>
        </div>

        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Layer Name</th>
                <th className="border px-2 py-1 text-left">Admin Level</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-left">Features</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{l.layer_name || "—"}</td>
                  <td className="border px-2 py-1">{l.admin_level || "—"}</td>
                  <td className="border px-2 py-1">{l.format || "—"}</td>
                  <td className="border px-2 py-1">{l.crs || "—"}</td>
                  <td className="border px-2 py-1">
                    {l.feature_count ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers uploaded yet.</p>
        )}
      </section>

      {/* --- GIS Data Health Panel --- */}
      <GISDataHealthPanel layers={layers} />

      {/* --- Map Section --- */}
      <section className="border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]} // default center (Philippines)
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(event) => {
            mapRef.current = event.target;
          }}
          className="rounded-md z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© OpenStreetMap contributors'
          />
        </MapContainer>
      </section>

      {/* --- Upload Modal --- */}
      {selectedVersion && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          datasetVersionId={selectedVersion.id}
          onUploaded={async () => {
            await fetchLayers(selectedVersion.id);
            setOpenUpload(false);
          }}
        />
      )}
    </SidebarLayout>
  );
}
