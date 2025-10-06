"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import EditGISVersionModal from "@/components/country/EditGISVersionModal";
import GISDataHealthPanel, { GISLayer } from "@/components/country/GISDataHealthPanel";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, ExternalLink, Pencil } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function GISPage({ params }: any) {
  const { id } = params as { id: string };

  type GISDatasetVersion = {
    id: string;
    title: string;
    year: number | null;
    is_active: boolean;
    country_iso: string;
    source_name?: string | null;
    source_url?: string | null;
  };

  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);
  const [openEditVersion, setOpenEditVersion] = useState(false);

  const [visible, setVisible] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<Record<number, L.GeoJSON | null>>({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  });

  // ────────────── Load Versions ──────────────
  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVersions(data);
      setActiveVersion(data.find((v) => v.is_active) || data[0] || null);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [id]);

  // ────────────── Load Layers for Active Version ──────────────
  useEffect(() => {
    const loadLayers = async () => {
      if (!activeVersion) return;

      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", activeVersion.id)
        .eq("is_active", true)
        .order("admin_level_int");

      if (error || !data) return;

      const enriched: GISLayer[] = [];
      for (const l of data) {
        const filePath = (l as any)?.source?.path as string | undefined;
        if (!filePath) {
          enriched.push({ ...(l as any), crs: null, feature_count: null });
          continue;
        }

        try {
          const { data: urlData } = supabase.storage.from("gis_raw").getPublicUrl(filePath);
          const url = urlData?.publicUrl;
          if (!url) {
            enriched.push({ ...(l as any), crs: null, feature_count: null });
            continue;
          }

          const res = await fetch(url);
          const gj = await res.json();

          const crs =
            gj?.crs?.properties?.name ||
            gj?.crs?.name ||
            "EPSG:4326";
          const feature_count = Array.isArray(gj?.features) ? gj.features.length : 0;

          enriched.push({
            ...(l as any),
            crs,
            feature_count,
            source: { ...(l as any).source, url },
          });
        } catch {
          enriched.push({ ...(l as any), crs: null, feature_count: null });
        }
      }
      setLayers(enriched);
    };
    loadLayers();
  }, [activeVersion]);

  // ────────────── Initialize Map ──────────────
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("gis-map", {
      center: [12.8797, 121.774],
      zoom: 5,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // ────────────── Render Layers ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(layerGroupsRef.current).forEach((g) => g?.remove());
    layerGroupsRef.current = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null };

    const colors: Record<number, string> = {
      0: "var(--gsc-blue)",
      1: "var(--gsc-green)",
      2: "var(--gsc-orange)",
      3: "var(--gsc-red)",
      4: "#7e57c2",
      5: "#009688",
    };

    const addedBounds: L.LatLngBounds[] = [];

    const addLayer = async (l: GISLayer) => {
      const lvl = l.admin_level_int ?? 0;
      if (!visible[lvl]) return;
      const url = l.source?.url;
      if (!url) return;

      try {
        const data = await fetch(url).then((r) => r.json());
        const group = L.geoJSON(data, {
          style: { color: colors[lvl] || "#666", weight: 1, fillOpacity: 0 },
        }).addTo(map);

        layerGroupsRef.current[lvl] = group;
        const b = group.getBounds();
        if (b.isValid()) addedBounds.push(b);
      } catch (e) {
        console.warn("Failed to draw layer:", l.layer_name, e);
      }
    };

    (async () => {
      for (const l of layers) await addLayer(l);

      if (addedBounds.length) {
        const base = new L.LatLngBounds(
          addedBounds[0].getSouthWest(),
          addedBounds[0].getNorthEast()
        );
        const merged = addedBounds.reduce((acc, b) => acc.extend(b), base);
        map.fitBounds(merged.pad(0.05));
      }
    })();
  }, [layers, visible]);

  const headerProps = {
    title: "GIS Datasets",
    group: "country-config" as const,
    description: "Manage and visualize GIS layers for the selected country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: id },
          { label: "GIS" },
        ]}
      />
    ),
  };

  const toggleLevel = (lvl: number) => setVisible((v) => ({ ...v, [lvl]: !v[lvl] }));

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 items-start">
        {/* Dataset Version Card */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase">Dataset Version</p>
            {activeVersion && (
              <button
                onClick={() => setOpenEditVersion(true)}
                className="text-[color:var(--gsc-blue)] hover:text-[color:var(--gsc-red)]"
                title="Edit Version"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={activeVersion?.id || ""}
              onChange={(e) => {
                const selected = versions.find((v) => v.id === e.target.value);
                setActiveVersion(selected || null);
              }}
              className="text-sm border rounded p-1 flex-1"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} {v.year ? `(${v.year})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setOpenNewVersion(true)}
              className="px-3 py-1 text-sm text-white rounded hover:opacity-90"
              style={{ backgroundColor: "var(--gsc-blue)" }}
            >
              + New
            </button>
          </div>

          {/* Source metadata */}
          {activeVersion?.source_name || activeVersion?.source_url ? (
            <div className="mt-3 text-sm text-gray-700">
              {activeVersion.source_name && (
                <p className="font-medium">{activeVersion.source_name}</p>
              )}
              {activeVersion.source_url && (
                <a
                  href={activeVersion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[color:var(--gsc-blue)] hover:underline mt-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Source
                </a>
              )}
            </div>
          ) : null}
        </div>

        {/* Active Layers Card */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase">Active Layers</p>
          <p className="text-lg font-semibold">
            {layers.length}{" "}
            <span className="text-gray-500 text-sm">ADM0–ADM5 supported</span>
          </p>
        </div>

        {/* Country Info Card */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Country</p>
              <p className="text-lg font-semibold">{id}</p>
              <p className="text-gray-500 text-sm">SSC GIS</p>
            </div>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white rounded hover:opacity-90"
              style={{ backgroundColor: "var(--gsc-red)" }}
            >
              <Upload className="w-4 h-4" />
              Upload GIS
            </button>
          </div>
        </div>
      </div>

      {/* GIS Data Health Summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Map + Table layout */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-[color:var(--gsc-beige)] text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 border">Level</th>
              <th className="px-4 py-2 border">Layer</th>
              <th className="px-4 py-2 border text-center">Features</th>
              <th className="px-4 py-2 border text-center">CRS</th>
              <th className="px-4 py-2 border text-center">Format</th>
              <th className="px-4 py-2 border text-center">Source</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 border font-medium">
                  {l.admin_level || `ADM${l.admin_level_int ?? ""}`}
                </td>
                <td className="px-4 py-2 border">{l.layer_name}</td>
                <td className="px-4 py-2 border text-center">
                  {l.feature_count ?? "—"}
                </td>
                <td className="px-4 py-2 border text-center">
                  {l.crs ?? "—"}
                </td>
                <td className="px-4 py-2 border text-center">
                  {l.format ?? "json"}
                </td>
                <td className="px-4 py-2 border text-center">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visibility Controls */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Layers:</span>
        {[0, 1, 2, 3, 4, 5].map((lvl) => (
          <label key={lvl} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!visible[lvl]}
              onChange={() => toggleLevel(lvl)}
            />
            <span>{`ADM${lvl}`}</span>
          </label>
        ))}
      </div>

      {/* Map */}
      <div id="gis-map" className="w-full h-[600px] rounded-lg border shadow-sm z-0" />

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          countryIso={id}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => window.location.reload()}
        />
      )}

      {openNewVersion && (
        <CreateGISVersionModal
          countryIso={id}
          onClose={() => setOpenNewVersion(false)}
          onCreated={async () => loadVersions()}
        />
      )}

      {openEditVersion && activeVersion && (
        <EditGISVersionModal
          versionId={activeVersion.id}
          currentValues={{
            title: activeVersion.title,
            year: activeVersion.year,
            source_name: activeVersion.source_name,
            source_url: activeVersion.source_url,
          }}
          onClose={() => setOpenEditVersion(false)}
          onSaved={async () => loadVersions()}
        />
      )}
    </SidebarLayout>
  );
}
