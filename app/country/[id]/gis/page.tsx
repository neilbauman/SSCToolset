"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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

import { Upload, Layers, Edit, Trash2, Plus, Eye } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer, GISDatasetVersion } from "@/types/gis";

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<any>(null);
  const [datasetVersions, setDatasetVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, any>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
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

  const mapRef = useRef<L.Map | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch Country
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).maybeSingle();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  // ---------------------------------------------------------------------------
  // Fetch Versions
  // ---------------------------------------------------------------------------
  const fetchVersions = async () => {
    const { data } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (data) {
      setDatasetVersions(data);
      const active = data.find((v) => v.is_active);
      setSelectedVersion((prev) => active || prev || data[0] || null);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // ---------------------------------------------------------------------------
  // Fetch Layers for selected version
  // ---------------------------------------------------------------------------
  const fetchLayers = async (versionId: string) => {
    const { data } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .order("admin_level_int", { ascending: true });
    if (data) setLayers(data);
  };

  useEffect(() => {
    if (selectedVersion?.id) fetchLayers(selectedVersion.id);
    else setLayers([]);
  }, [selectedVersion?.id]);

  // ---------------------------------------------------------------------------
  // Lazy load GeoJSON for visible layers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      for (const layer of layers) {
        const level = layer.admin_level ?? "";
        if (!visibleLevels[level]) continue;
        if (geojsonById[layer.id]) continue;

        try {
          setLoadingIds((s) => new Set(s).add(layer.id));

          const path =
            (layer as any).path ||
            layer.storage_path ||
            layer.source?.path ||
            `${countryIso}/${layer.layer_name}`;
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gis_raw/${path}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${layer.layer_name}`);
          const geojson = await res.json();
          setGeojsonById((m) => ({ ...m, [layer.id]: geojson }));

          // center map on ADM0 once loaded
          if (layer.admin_level === "ADM0" && mapRef.current) {
            const bounds = L.geoJSON(geojson).getBounds();
            if (bounds.isValid()) mapRef.current.fitBounds(bounds, { maxZoom: 6 });
          }
        } catch (e) {
          console.error("Layer fetch error:", e);
        } finally {
          setLoadingIds((s) => {
            const next = new Set(s);
            next.delete(layer.id);
            return next;
          });
        }
      }
    })();
  }, [visibleLevels, layers, countryIso, geojsonById]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
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

  const handleToggleVisibility = (level: string) => {
    if (!level) return;
    setVisibleLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const handleDelete = async (layer: GISLayer) => {
    await supabase.from("gis_layers").delete().eq("id", layer.id);
    setDeleteLayer(null);
    setLayers((prev) => prev.filter((l) => l.id !== layer.id));
  };

  const handleMakeActive = async (versionId: string) => {
    await supabase.from("gis_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("gis_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
  };

  const handleAddNewVersion = async () => {
    const now = new Date();
    const title = `New Version ${now.toLocaleDateString()}`;
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .insert({ country_iso: countryIso, title, is_active: false })
      .select("*")
      .single();
    if (error) {
      console.error("Error creating version:", error);
      return;
    }
    setDatasetVersions((prev) => [data as GISDatasetVersion, ...prev]);
    setSelectedVersion(data as GISDatasetVersion);
  };

  const layersForHealth = useMemo(() => {
    return layers.map((l) => {
      const gj = geojsonById[l.id];
      const loadedCount = Array.isArray(gj?.features) ? gj.features.length : undefined;
      return { ...l, feature_count: l.feature_count ?? loadedCount ?? 0 };
    });
  }, [layers, geojsonById]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Dataset Versions --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-700" /> Dataset Versions
          </h2>
          <button
            onClick={handleAddNewVersion}
            className="flex items-center text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-1" /> Add New Version
          </button>
        </div>

        {datasetVersions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Active</th>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasetVersions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                    onClick={() => setSelectedVersion(v)}
                  >
                    <td className="border px-2 py-1">
                      <input
                        type="radio"
                        name="activeVersion"
                        checked={!!v.is_active}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleMakeActive(v.id);
                        }}
                      />
                    </td>
                    <td className="border px-2 py-1">{v.title}</td>
                    <td className="border px-2 py-1">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="border px-2 py-1">
                      <button
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersion(v);
                          fetchLayers(v.id);
                        }}
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No dataset versions available</p>
        )}
      </div>

      {/* --- Version Layers --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-[color:var(--gsc-blue)]">Version Layers</h3>
          {selectedVersion && (
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
            </button>
          )}
        </div>

        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Level</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-center">Visible</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <td className="border px-2 py-1">{l.admin_level}</td>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1">{l.format ?? "—"}</td>
                  <td className="border px-2 py-1">{l.crs ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={!!visibleLevels[l.admin_level ?? ""]}
                      onChange={() => handleToggleVisibility(l.admin_level ?? "")}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <div className="flex gap-2">
                      <button onClick={() => setEditLayer(l)} className="text-blue-700 hover:underline" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteLayer(l)} className="text-red-700 hover:underline" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-between border rounded p-3 bg-gray-50">
            <p className="text-sm italic text-gray-600">No layers currently uploaded to this version.</p>
            {selectedVersion && (
              <button
                onClick={() => setOpenUpload(true)}
                className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
              >
                <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
              </button>
            )}
          </div>
        )}
      </div>

      <GISDataHealthPanel layers={layersForHealth} />

      {/* --- Map --- */}
      <section className="mt-6 border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[11.0, 122.0]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={() => {
            const map = mapRef.current;
            if (!map && (window as any).L?.map) {
              mapRef.current = (window as any).L.map;
            }
          }}
          ref={mapRef as any}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layers.map((l) => {
            const visible = !!visibleLevels[l.admin_level ?? ""];
            const data = geojsonById[l.id];
            if (!visible || !data) return null;
            const color =
              l.admin_level === "ADM0"
                ? "#000"
                : l.admin_level === "ADM1"
                ? "#b30000"
                : l.admin_level === "ADM2"
                ? "#006400"
                : l.admin_level === "ADM3"
                ? "#1e90ff"
                : "#999";
            return <GeoJSON key={l.id} data={data} style={{ color, weight: 1, fillOpacity: 0.15 }} />;
          })}
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
            await fetchLayers(selectedVersion.id);
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
            if (selectedVersion?.id) await fetchLayers(selectedVersion.id);
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
