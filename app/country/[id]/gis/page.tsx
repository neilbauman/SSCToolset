"use client";

import { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Plus, MoreVertical } from "lucide-react";

import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types";

type GISVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);

  const [openUpload, setOpenUpload] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setVersions(data || []);
    const active = data?.find((v) => v.is_active);
    if (active) {
      setSelectedVersion(active);
      await fetchLayers(active.id);
    }
  };

  // Fetch layers
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .order("admin_level", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setLayers(data || []);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const headerProps = {
    title: `${countryIso.toUpperCase()} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize uploaded administrative boundary layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  // Handle delete
  const handleDeleteLayer = async (id: string) => {
    await supabase.from("gis_layers").delete().eq("id", id);
    if (selectedVersion) await fetchLayers(selectedVersion.id);
  };

  // Layer menu
  const LayerActions = ({ layer }: { layer: GISLayer }) => (
    <div className="relative" ref={menuRef}>
      <button
        className="text-blue-700 hover:underline flex items-center gap-1"
        onClick={() => setMenuFor(menuFor === layer.id ? null : layer.id)}
      >
        Actions <MoreVertical className="w-4 h-4" />
      </button>
      {menuFor === layer.id && (
        <div className="absolute right-0 mt-2 w-32 rounded border bg-white shadow z-10">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              setEditLayer(layer);
              setMenuFor(null);
            }}
          >
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setDeleteLayer(layer);
              setMenuFor(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const totalLayers = layers.length;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <section className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-1" /> Add GIS Version
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
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${selectedVersion?.id === v.id ? "bg-blue-50" : ""}`}
                  onClick={() => {
                    setSelectedVersion(v);
                    fetchLayers(v.id);
                  }}
                >
                  <td className="border px-2 py-1">{v.title || "—"}</td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">
                    {v.is_active ? (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions found</p>
        )}
      </section>

      {/* Version Layers */}
      {selectedVersion && (
        <section className="border rounded-lg p-4 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Version Layers
            </h2>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1" /> Add GIS Layer
            </button>
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
                  <th className="border px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{l.layer_name || "—"}</td>
                    <td className="border px-2 py-1">{l.admin_level || "—"}</td>
                    <td className="border px-2 py-1">{l.format || "—"}</td>
                    <td className="border px-2 py-1">{l.crs || "—"}</td>
                    <td className="border px-2 py-1">{l.feature_count ?? "—"}</td>
                    <td className="border px-2 py-1">
                      <LayerActions layer={l} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="italic text-gray-500">No layers found</p>
          )}
        </section>
      )}

      {/* GIS Data Health */}
      <GISDataHealthPanel layers={layers} />

      {/* Map */}
      <section className="border rounded-lg p-2 shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          className="rounded-md"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
        </MapContainer>
      </section>

      {/* --- Modals --- */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        datasetVersionId={selectedVersion?.id || ""}
        onUploaded={() => {
          if (selectedVersion) fetchLayers(selectedVersion.id);
          setOpenUpload(false);
        }}
      />

      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={async () => {
            if (selectedVersion) await fetchLayers(selectedVersion.id);
            setEditLayer(null);
          }}
        />
      )}

      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`Delete layer "${deleteLayer.layer_name}"? This action cannot be undone.`}
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
