"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import {
  Database,
  Layers,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types";

type Country = {
  iso_code: string;
  name: string;
};

type GISVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean;
  created_at: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const mapRef = useRef<any>(null);

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);

  const [openUploadVersion, setOpenUploadVersion] = useState(false);
  const [openUploadLayer, setOpenUploadLayer] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);

  // Fetch Country Metadata
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

  // Fetch Versions
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
    if (initial) fetchLayers(initial.id);
    else setLayers([]);
  };

  // Fetch Layers for selected version
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching GIS layers:", error);
      setLayers([]);
      return;
    }

    setLayers(data as GISLayer[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // Delete Layer
  const handleDeleteLayer = async (layerId: string) => {
    const { error } = await supabase.from("gis_layers").delete().eq("id", layerId);
    if (error) console.error("Error deleting layer:", error);
    await fetchLayers(selectedVersion?.id || "");
  };

  const totalLayers = layers.length;

  // Header Configuration
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Datasets`,
    group: "country-config" as const,
    description: "Manage, visualize, and validate uploaded GIS administrative boundaries.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Versions Panel --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white relative z-[1000]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUploadVersion(true)}
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
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedVersion(v);
                    fetchLayers(v.id);
                  }}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.source ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? (
                      <span className="text-green-600 font-semibold">✔</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions found</p>
        )}
      </div>

      {/* --- Layers Panel --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white relative z-[1000]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenUploadLayer(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            disabled={!selectedVersion}
          >
            <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
        </div>

        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Admin Level</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{l.layer_name ?? "—"}</td>
                  <td className="border px-2 py-1">{l.admin_level ?? "—"}</td>
                  <td className="border px-2 py-1">{l.format ?? "—"}</td>
                  <td className="border px-2 py-1">{l.crs ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditLayer(l)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteLayer(l)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers uploaded for this version</p>
        )}
      </div>

      {/* --- Data Health Panel --- */}
      <GISDataHealthPanel layers={layers} />

      {/* --- Map Panel --- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 relative z-0">
        <div className="lg:col-span-3 border rounded-lg overflow-hidden shadow-sm">
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ height: "600px", width: "100%" }}
            className="z-0"
            whenReady={(event: any) => {
              mapRef.current = event.target;
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            {layers.map((layer) => (
              <GeoJSON
                key={layer.id}
                data={{
                  type: "FeatureCollection",
                  features: [],
                }}
                style={{
                  color: "#630710",
                  weight: 1,
                }}
              />
            ))}
          </MapContainer>
        </div>
      </section>

      {/* --- Modals --- */}
      <UploadGISModal
        open={openUploadLayer}
        onClose={() => setOpenUploadLayer(false)}
        countryIso={countryIso}
        datasetVersionId={selectedVersion?.id || ""}
        onUploaded={() => fetchLayers(selectedVersion?.id || "")}
      />

      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={async () => {
            await fetchLayers(selectedVersion?.id || "");
            setEditLayer(null);
          }}
        />
      )}

      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`Delete layer "${deleteLayer.layer_name}"?`}
          onClose={() => setDeleteLayer(null)}
          onConfirm={async () => {
            await handleDeleteLayer(deleteLayer.id);
            setDeleteLayer(null);
          }}
        />
      )}
    </SidebarLayout>
  );
}
