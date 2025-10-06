"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";

import { Database, Upload, Layers, MoreVertical } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
  is_active: boolean | null;
  created_at: string;
};

type GISLayer = {
  id: string;
  dataset_version_id: string | null;
  country_iso: string | null;
  admin_level: string;          // "ADM0"..."ADM5"
  layer_name: string;           // <-- display name lives here
  storage_path: string | null;  // kept for future download use
  created_at: string;
};

const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);

  // action menu state
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // toggles
  const [visible, setVisible] = useState<Record<(typeof LEVELS)[number], boolean>>({
    ADM0: false, ADM1: false, ADM2: false, ADM3: false, ADM4: false, ADM5: false
  });

  // fetch country meta
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).maybeSingle();
      if (data) setCountry(data as Country);
    };
    run();
  }, [countryIso]);

  // fetch versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error) {
      const list = (data ?? []) as GISVersion[];
      setVersions(list);
      const active = list.find(v => v.is_active);
      const initial = active || list[0] || null;
      setSelectedVersion(initial);
      if (initial) fetchLayers(initial.id);
      else setLayers([]);
    }
  };

  // fetch layers for a version
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("id,dataset_version_id,country_iso,admin_level,layer_name,storage_path,created_at")
      .eq("dataset_version_id", versionId)
      .order("created_at", { ascending: true });
    if (!error) setLayers((data ?? []) as GISLayer[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize uploaded administrative boundary layers.",
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

  const countsByLevel = useMemo(() => {
    const map: Record<string, number> = {};
    for (const lvl of LEVELS) map[lvl] = 0;
    for (const L of layers) {
      if (L.admin_level && map[L.admin_level] !== undefined) map[L.admin_level]++;
    }
    return map as Record<(typeof LEVELS)[number], number>;
  }, [layers]);

  const totalLayers = layers.length;

  const handleDelete = async (layerId: string) => {
    await supabase.from("gis_layers").delete().eq("id", layerId);
    setDeleteLayer(null);
    if (selectedVersion?.id) await fetchLayers(selectedVersion.id);
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Versions table */}
      <section className="border rounded-lg mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-700" /> Dataset Versions
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
              disabled={!selectedVersion}
              title={selectedVersion ? "Upload GIS Layer" : "Create/select a version first"}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload GIS Dataset
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.length ? (
                versions.map(v => {
                  const isActive = !!v.is_active;
                  const isSelected = selectedVersion?.id === v.id;
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => {
                        setSelectedVersion(v);
                        fetchLayers(v.id);
                      }}
                    >
                      <td className="px-3 py-2">{v.title ?? "—"}</td>
                      <td className="px-3 py-2">{v.year ?? "—"}</td>
                      <td className="px-3 py-2">{v.dataset_date ?? "—"}</td>
                      <td className="px-3 py-2">{v.source ?? "—"}</td>
                      <td className="px-3 py-2">
                        {isActive ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-blue-700 underline cursor-pointer">Actions</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-4 italic text-gray-500" colSpan={6}>
                    No versions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Version Layers table */}
      <section className="border rounded-lg mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            disabled={!selectedVersion}
          >
            + Add GIS Layer
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Admin Level</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.length ? (
                layers.map(L => {
                  const isOpen = openMenuFor === L.id;
                  return (
                    <tr key={L.id} className="hover:bg-gray-50">
                      {/* 👇 show friendly name */}
                      <td className="px-3 py-2">{L.layer_name || "—"}</td>
                      <td className="px-3 py-2">{L.admin_level}</td>
                      <td className="px-3 py-2">
                        {new Date(L.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative inline-block" ref={menuRef}>
                          <button
                            className="text-blue-700 hover:underline flex items-center gap-1"
                            onClick={() => setOpenMenuFor(isOpen ? null : L.id)}
                          >
                            Actions <MoreVertical className="w-4 h-4" />
                          </button>
                          {isOpen && (
                            <div className="absolute right-0 mt-2 w-32 rounded border bg-white shadow z-10">
                              <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                onClick={() => {
                                  setEditLayer(L);
                                  setOpenMenuFor(null);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteLayer(L);
                                  setOpenMenuFor(null);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-4 italic text-gray-500" colSpan={4}>
                    No layers in this version.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dataset health (uses your existing panel) */}
      <GISDataHealthPanel totalUnits={totalLayers} />

      {/* Map + toggles */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <MapContainer
            center={[12.8797, 121.7740]} // Philippines center as default
            zoom={6}
            style={{ height: "560px", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Real GeoJSON rendering can be wired when storage parsing is ready */}
          </MapContainer>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Layer Toggles</h3>
          <p className="text-xs text-gray-500 mb-3">Turn layers on/off (default off).</p>
          <div className="space-y-2">
            {LEVELS.map(lvl => (
              <label key={lvl} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visible[lvl]}
                  onChange={(e) => setVisible(prev => ({ ...prev, [lvl]: e.target.checked }))}
                />
                {lvl} <span className="text-gray-500">({countsByLevel[lvl]} {countsByLevel[lvl] === 1 ? "layer" : "layers"})</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Modals */}
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

      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={async () => {
            if (selectedVersion?.id) await fetchLayers(selectedVersion.id);
            setEditLayer(null);
          }}
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
