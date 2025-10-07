"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Upload, Layers, Edit, Trash2 } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer, GISDatasetVersion } from "@/types/gis";

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<any>(null);
  const [datasetVersions, setDatasetVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, any>>({});
  const [visibleLevels, setVisibleLevels] = useState<Record<string, boolean>>({
    ADM0: true,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  const [openUpload, setOpenUpload] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const mapRef = useRef<L.Map | null>(null);

  // --- Fetch country info
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).maybeSingle();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  // --- Fetch dataset versions
  useEffect(() => {
    const loadVersions = async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (data) {
        setDatasetVersions(data);
        const active = data.find((v) => v.is_active);
        setSelectedVersion(active || data[0] || null);
      }
    };
    loadVersions();
  }, [countryIso]);

  // --- Fetch layers for selected version
  useEffect(() => {
    const loadLayers = async () => {
      if (!selectedVersion) return;
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", selectedVersion.id)
        .order("admin_level_int", { ascending: true });
      if (data) setLayers(data);
    };
    loadLayers();
  }, [selectedVersion]);

  // --- Fetch GeoJSON for visible layers
  useEffect(() => {
    const loadVisibleLayers = async () => {
      for (const layer of layers) {
        const level = layer.admin_level ?? "";
        if (!visibleLevels[level] || geojsonById[layer.id]) continue;

        try {
          setLoadingIds((s) => new Set(s).add(layer.id));
          const path =
            layer.storage_path ||
            layer.source?.path ||
            `${countryIso}/${layer.layer_name}`;
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gis_raw/${path}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${layer.layer_name}`);
          const geojson = await res.json();
          setGeojsonById((m) => ({ ...m, [layer.id]: geojson }));

          // Auto-center on ADM0
          if (layer.admin_level === "ADM0" && mapRef.current) {
            const bounds = L.geoJSON(geojson).getBounds();
            mapRef.current.fitBounds(bounds, { maxZoom: 6 });
          }
        } catch (err) {
          console.error("Layer fetch error:", err);
        } finally {
          setLoadingIds((s) => {
            const copy = new Set(s);
            copy.delete(layer.id);
            return copy;
          });
        }
      }
    };
    loadVisibleLayers();
  }, [visibleLevels, layers, countryIso, geojsonById]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage, visualize, and validate GIS administrative boundaries.",
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

  const handleToggleVisibility = (level: string) =>
    setVisibleLevels((prev) => ({ ...prev, [level]: !prev[level] }));

  const handleDelete = async (layer: GISLayer) => {
    await supabase.from("gis_layers").delete().eq("id", layer.id);
    setDeleteLayer(null);
    setLayers((prev) => prev.filter((l) => l.id !== layer.id));
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Dataset Versions --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-700" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
        </div>

        {datasetVersions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {datasetVersions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedVersion(v)}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">
                    {v.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No dataset versions available</p>
        )}
      </div>

      {/* --- Version Layers Table --- */}
      {layers.length > 0 && (
        <div className="border rounded-lg p-4 shadow-sm mb-4">
          <h3 className="text-base font-semibold mb-2 text-[color:var(--gsc-blue)]">Version Layers</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Level</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-center">Visible</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1">{l.admin_level}</td>
                  <td className="border px-2 py-1">{l.format ?? "—"}</td>
                  <td className="border px-2 py-1">{l.crs ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={visibleLevels[l.admin_level ?? ""]}
                      onChange={() => handleToggleVisibility(l.admin_level ?? "")}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <div className="flex gap-2">
                      <button onClick={() => setEditLayer(l)} className="text-blue-700 hover:underline">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteLayer(l)} className="text-red-700 hover:underline">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Data Health --- */}
      <GISDataHealthPanel layers={layers} />

      {/* --- Map Viewer --- */}
      <section className="mt-6 border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[11.0, 122.0]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(event) => {
            mapRef.current = event.target;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layers.map(
            (l) =>
              visibleLevels[l.admin_level ?? ""] &&
              geojsonById[l.id] && (
                <GeoJSON
                  key={l.id}
                  data={geojsonById[l.id]}
                  style={{
                    color:
                      l.admin_level === "ADM0"
                        ? "#000"
                        : l.admin_level === "ADM1"
                        ? "#b30000"
                        : l.admin_level === "ADM2"
                        ? "#006400"
                        : l.admin_level === "ADM3"
                        ? "#1e90ff"
                        : "#999",
                    weight: 1,
                    fillOpacity: 0.15,
                  }}
                />
              )
          )}
        </MapContainer>
      </section>

      {/* --- Modals --- */}
      {openUpload && selectedVersion && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          datasetVersionId={selectedVersion.id}
          onUploaded={async () => {
            setOpenUpload(false);
            const { data } = await supabase
              .from("gis_layers")
              .select("*")
              .eq("dataset_version_id", selectedVersion.id);
            if (data) setLayers(data);
          }}
        />
      )}

      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={async () => {
            setEditLayer(null);
            const { data } = await supabase
              .from("gis_layers")
              .select("*")
              .eq("dataset_version_id", selectedVersion?.id);
            if (data) setLayers(data);
          }}
        />
      )}

      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`Delete layer "${deleteLayer.layer_name}"? This cannot be undone.`}
          onClose={() => setDeleteLayer(null)}
          onConfirm={() => handleDelete(deleteLayer)}
        />
      )}
    </SidebarLayout>
  );
}
