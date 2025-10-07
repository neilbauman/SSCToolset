"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer, GISDatasetVersion } from "@/types/gis";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";

import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { Layers, PlusCircle, Pencil, Trash2, RefreshCw } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */
type CountryLite = {
  iso_code: string;
  name: string;
  lat?: number | null;
  lon?: number | null;
};

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */
export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<CountryLite | null>(null);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [loading, setLoading] = useState(false);

  const [visibleByLevel, setVisibleByLevel] = useState<Record<string, boolean>>({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  const [geojsonByLayer, setGeojsonByLayer] = useState<Record<string, GeoJsonObject | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const [openUpload, setOpenUpload] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);

  /* ------------------------------------------------------------------------ */
  /*                            Fetching functions                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("countries")
        .select("iso_code,name,lat,lon")
        .eq("iso_code", countryIso)
        .maybeSingle();
      if (c) {
        setCountry(c as CountryLite);
        if (c.lat && c.lon) setMapCenter([c.lat, c.lon]);
      }
      await loadActiveVersionAndLayers(countryIso);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  const loadActiveVersionAndLayers = async (iso: string) => {
    setLoading(true);
    try {
      const { data: active } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", iso)
        .eq("is_active", true)
        .maybeSingle();

      let version = (active as GISDatasetVersion | null) ?? null;
      if (!version) {
        const { data: latest } = await supabase
          .from("gis_dataset_versions")
          .select("*")
          .eq("country_iso", iso)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        version = (latest as GISDatasetVersion | null) ?? null;
      }

      setActiveVersion(version);
      if (version) {
        const { data: ls } = await supabase
          .from("gis_layers")
          .select("*")
          .eq("dataset_version_id", version.id)
          .order("admin_level_int", { ascending: true })
          .order("created_at", { ascending: true });

        setLayers((ls ?? []) as GISLayer[]);
      } else {
        setLayers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                          GeoJSON Public Fetch Logic                       */
  /* ------------------------------------------------------------------------ */
  const fetchGeoJSONForLayer = async (l: GISLayer) => {
    try {
      setLoadingIds((s) => new Set(s).add(l.id));

      const bucket = l.source?.bucket ?? "gis_raw";
      const rawPath = l.source?.path ?? l.storage_path ?? l.layer_name ?? "";
      const normalized = rawPath.replace(/^\/?gis_raw\//, "");

      console.log("🌐 Fetching public GeoJSON", { bucket, rawPath, normalized });

      // Construct the public URL directly (bypasses auth)
      const publicUrl = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/${bucket}/${normalized}`;
      const res = await fetch(publicUrl);

      if (!res.ok) throw new Error(`Failed to fetch GeoJSON: ${res.status} ${res.statusText}`);

      const parsed = await res.json();
      setGeojsonByLayer((m) => ({ ...m, [l.id]: parsed }));
    } catch (e) {
      console.error("GeoJSON load failed:", e);
      setGeojsonByLayer((m) => ({ ...m, [l.id]: null }));
    } finally {
      setLoadingIds((s) => {
        const n = new Set(s);
        n.delete(l.id);
        return n;
      });
    }
  };

  useEffect(() => {
    for (const l of layers) {
      if (l.admin_level && visibleByLevel[l.admin_level] && geojsonByLayer[l.id] === undefined) {
        fetchGeoJSONForLayer(l);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, visibleByLevel]);

  /* ------------------------------------------------------------------------ */
  /*                            Interaction Handlers                          */
  /* ------------------------------------------------------------------------ */

  const toggleLevel = (lvl: string) =>
    setVisibleByLevel((s) => ({ ...s, [lvl]: !s[lvl] }));

  const handleDelete = async (id: string) => {
    await supabase.from("gis_layers").delete().eq("id", id);
    setDeleteLayer(null);
    await loadActiveVersionAndLayers(countryIso);
  };

  const handleAfterSave = async () => {
    setEditLayer(null);
    await loadActiveVersionAndLayers(countryIso);
  };

  /* ------------------------------------------------------------------------ */
  /*                                   UI                                     */
  /* ------------------------------------------------------------------------ */
  const headerProps = useMemo(
    () => ({
      title: `${country?.name ?? countryIso} – GIS Layers`,
      group: "country-config" as const,
      description: "Manage and visualize administrative boundary layers.",
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
    }),
    [country, countryIso]
  );

  const colors: Record<string, string> = {
    ADM0: "#2b8a3e",
    ADM1: "#1d4ed8",
    ADM2: "#a16207",
    ADM3: "#be185d",
    ADM4: "#0f766e",
    ADM5: "#7c3aed",
  };

  const levels = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Version */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            Dataset Version
          </h2>
          <div className="flex gap-2">
            <button
              className="border px-3 py-1 rounded text-sm flex items-center gap-1"
              onClick={() => loadActiveVersionAndLayers(countryIso)}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              className="bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded text-sm flex items-center gap-1 hover:opacity-90"
              onClick={() => setOpenUpload(true)}
              disabled={!activeVersion}
            >
              <PlusCircle className="w-4 h-4" /> Add GIS Layer
            </button>
          </div>
        </div>
        {activeVersion ? (
          <div className="text-sm text-gray-700">
            <strong>{activeVersion.title}</strong> ({activeVersion.year ?? "—"}) —{" "}
            {activeVersion.is_active ? "Active" : "Inactive"}
          </div>
        ) : (
          <p className="italic text-gray-500">No dataset version found.</p>
        )}
      </div>

      {/* Layers Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-2">Version Layers</h3>
        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Admin</th>
                <th className="border px-2 py-1 text-left">Layer Name</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">Features</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{l.admin_level}</td>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1">{l.crs ?? "—"}</td>
                  <td className="border px-2 py-1">{l.format ?? "—"}</td>
                  <td className="border px-2 py-1">{l.feature_count ?? "—"}</td>
                  <td className="border px-2 py-1">
                    <div className="flex gap-2">
                      <button
                        className="border px-2 py-0.5 rounded flex items-center gap-1"
                        onClick={() => setEditLayer(l)}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        className="border px-2 py-0.5 rounded flex items-center gap-1 text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteLayer(l)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers found for this version.</p>
        )}
      </div>

      <GISDataHealthPanel layers={layers} />

      {/* Map + Toggles */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="border rounded-lg p-4 shadow-sm space-y-2">
          <h3 className="font-semibold">Layer Visibility</h3>
          {levels.map((lvl) => {
            const hasLayer = layers.some((l) => l.admin_level === lvl);
            return (
              <label key={lvl} className={`flex items-center gap-2 text-sm ${!hasLayer ? "opacity-50" : ""}`}>
                <input
                  type="checkbox"
                  disabled={!hasLayer}
                  checked={!!visibleByLevel[lvl]}
                  onChange={() => toggleLevel(lvl)}
                />
                {lvl}
              </label>
            );
          })}
        </div>

        <div className="lg:col-span-2 border rounded-lg shadow-sm overflow-hidden">
          <MapContainer center={mapCenter} zoom={5} style={{ height: "600px", width: "100%" }} className="z-0">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {layers
              .filter((l) => l.admin_level && visibleByLevel[l.admin_level])
              .map((l) => {
                const data = geojsonByLayer[l.id];
                if (!data || loadingIds.has(l.id)) return null;
                return (
                  <GeoJSON
                    key={l.id}
                    data={data}
                    style={{
                      color: colors[l.admin_level ?? "ADM0"] ?? "#630710",
                      weight: 1.2,
                    }}
                    onEachFeature={(f, layer) => {
                      const n = (f.properties as any)?.name ?? (f.properties as any)?.NAME ?? "Unnamed";
                      const p = (f.properties as any)?.pcode ?? (f.properties as any)?.PCODE ?? "";
                      layer.bindPopup(`${n}${p ? ` (${p})` : ""}`);
                    }}
                  />
                );
              })}
          </MapContainer>
        </div>
      </section>

      {/* Modals */}
      {activeVersion && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          datasetVersionId={activeVersion.id}
          onUploaded={async () => {
            setOpenUpload(false);
            await loadActiveVersionAndLayers(countryIso);
          }}
        />
      )}
      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={handleAfterSave}
        />
      )}
      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`Delete layer "${deleteLayer.layer_name}"? This cannot be undone.`}
          onClose={() => setDeleteLayer(null)}
          onConfirm={() => handleDelete(deleteLayer.id)}
        />
      )}
    </SidebarLayout>
  );
}
