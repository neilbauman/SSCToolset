"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";

import { Database, Layers, Plus, MoreVertical } from "lucide-react";
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
  title: string;
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
  admin_level: string | null;
  storage_path?: string | null;
  source?: any | null;
  created_at?: string | null;
};

const ADM_LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);

  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [openDeleteVersion, setOpenDeleteVersion] = useState<GISVersion | null>(null);

  const [openAddLayer, setOpenAddLayer] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);

  const [visibleLevels, setVisibleLevels] = useState<Record<string, boolean>>({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  const mapRef = useRef<any>(null);

  // --- Fetch Country ---
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // --- Fetch Versions ---
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
    setSelectedVersion(initial || null);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // --- Fetch Layers for selected version ---
  const fetchLayers = async (versionId?: string | null) => {
    const vId = versionId ?? selectedVersion?.id;
    if (!vId) {
      setLayers([]);
      return;
    }
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", vId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching GIS layers:", error);
      setLayers([]);
      return;
    }
    setLayers((data ?? []) as GISLayer[]);
  };

  useEffect(() => {
    fetchLayers();
  }, [selectedVersion?.id]);

  // --- Header ---
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS`,
    group: "country-config" as const,
    description: "Manage GIS dataset versions and visualize administrative layers.",
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

  // --- Handlers ---
  const handleSelectVersion = async (v: GISVersion) => {
    setSelectedVersion(v);
    await fetchLayers(v.id);
  };

  const handleMakeActive = async (versionId: string) => {
    await supabase.from("gis_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("gis_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
  };

  const handleDeleteVersion = async (versionId: string) => {
    const { data: ls } = await supabase.from("gis_layers").select("id").eq("dataset_version_id", versionId);
    const layerIds = (ls ?? []).map((r) => r.id);
    if (layerIds.length) {
      await supabase.from("gis_layers").delete().in("id", layerIds);
    }
    await supabase.from("gis_dataset_versions").delete().eq("id", versionId);
    setOpenDeleteVersion(null);
    await fetchVersions();
    setLayers([]);
  };

  const toggleLevel = (level: (typeof ADM_LEVELS)[number]) => {
    setVisibleLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const layerNameFromRow = (row: GISLayer): string => {
    const sourceName = (row?.source && (row.source.name || row.source.layerName)) || "";
    if (sourceName) return String(sourceName);
    const sp = row?.storage_path || "";
    if (sp) return sp.split("/").pop() || sp;
    return row.id;
  };

  const layersByLevel = useMemo(() => {
    const grouped: Record<string, GISLayer[]> = {};
    for (const lvl of ADM_LEVELS) grouped[lvl] = [];
    for (const r of layers) {
      const lvl = (r.admin_level || "").toUpperCase();
      if (ADM_LEVELS.includes(lvl as any)) grouped[lvl].push(r);
    }
    return grouped;
  }, [layers]);

  // --- Action menus ---
  const LayerActionsMenu = ({ row }: { row: GISLayer }) => (
    <div className="relative">
      <button
        className="text-blue-700 hover:underline flex items-center gap-1"
        onClick={() => setOpenMenuFor(openMenuFor === row.id ? null : row.id)}
      >
        Actions <MoreVertical className="w-4 h-4" />
      </button>
      {openMenuFor === row.id && (
        <div className="absolute right-0 mt-2 w-40 rounded border bg-white shadow z-10">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              setEditLayer(row);
              setOpenMenuFor(null);
            }}
          >
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setDeleteLayer(row);
              setOpenMenuFor(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const VersionActionsMenu = ({ v }: { v: GISVersion }) => {
    const isSelected = selectedVersion?.id === v.id;
    const isActive = !!v.is_active;
    return (
      <div className="relative">
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

  // --- Render ---
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
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
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">—</span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <VersionActionsMenu v={v} />
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

      {/* Version Layers */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenAddLayer(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90 disabled:opacity-60"
            disabled={!selectedVersion}
            title={selectedVersion ? "Add GIS Layer" : "Select a version first"}
          >
            <Plus className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
        </div>

        {!selectedVersion ? (
          <p className="text-sm italic text-gray-500">Select a version to view its layers.</p>
        ) : layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Admin Level</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{layerNameFromRow(r)}</td>
                  <td className="border px-2 py-1">{r.admin_level ?? "—"}</td>
                  <td className="border px-2 py-1">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td className="border px-2 py-1">
                    <LayerActionsMenu row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers found for this version.</p>
        )}
      </div>

      {/* Map & Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-0 overflow-hidden shadow-sm">
          <div className="h-[520px]">
            <MapContainer
              ref={mapRef as any}
              center={[14.5995, 120.9842]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              className="rounded-lg"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
          </div>
        </div>

        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="text-base font-semibold mb-2">Layer Toggles</h3>
          <p className="text-xs text-gray-600 mb-3">Turn layers on/off (default off).</p>
          <div className="space-y-2">
            {ADM_LEVELS.map((lvl) => (
              <label key={lvl} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!visibleLevels[lvl]}
                  onChange={() => toggleLevel(lvl)}
                  disabled={!layersByLevel[lvl]?.length}
                />
                <span>
                  {lvl}{" "}
                  <span className="text-gray-500">
                    ({(layersByLevel[lvl] || []).length}{" "}
                    {((layersByLevel[lvl] || []).length === 1 && "layer") || "layers"})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {openDeleteVersion && (
        <ConfirmDeleteModal
          open={!!openDeleteVersion}
          message={`This will permanently remove the version "${openDeleteVersion.title ?? ""}" and all of its layers.`}
          onClose={() => setOpenDeleteVersion(null)}
          onConfirm={async () => {
            await handleDeleteVersion(openDeleteVersion.id);
          }}
        />
      )}

      {openAddLayer && selectedVersion && (
        <UploadGISModal
          open={openAddLayer}
          onClose={() => setOpenAddLayer(false)}
          countryIso={countryIso}
          datasetVersionId={selectedVersion.id}
          onUploaded={async () => {
            setOpenAddLayer(false);
            await fetchLayers();
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
            await fetchLayers();
          }}
        />
      )}

      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`This will permanently remove the layer "${layerNameFromRow(deleteLayer)}". This cannot be undone.`}
          onClose={() => setDeleteLayer(null)}
          onConfirm={async () => {
            await supabase.from("gis_layers").delete().eq("id", deleteLayer.id);
            setDeleteLayer(null);
            await fetchLayers();
          }}
        />
      )}
    </SidebarLayout>
  );
}
