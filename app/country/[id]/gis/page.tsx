"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { Trash2 } from "lucide-react";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection, Geometry } from "geojson";
import type { Map as LeafletMap, LatLngBoundsExpression } from "leaflet";

// Lazy load map components
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);

export default function CountryGISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);

  // ---------- Load GIS layers ----------
  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) console.error("Error loading layers:", error);
    setLayers(data || []);
  };

  // ---------- Load GeoJSON ----------
  const fetchGeoJSON = async (layer: GISLayer) => {
    if (!layer.source?.path) return;
    const bucket = layer.source?.bucket || "gis_raw";
    const { data } = supabase.storage.from(bucket).getPublicUrl(layer.source.path);
    if (!data?.publicUrl) return;

    try {
      const res = await fetch(data.publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as FeatureCollection;
      setGeojsonById((m) => ({ ...m, [layer.id]: json }));
      console.log(`✅ Loaded ${layer.layer_name}: ${json.features?.length} features`);
    } catch (err) {
      console.error("❌ Failed to load GeoJSON:", layer.layer_name, err);
    }
  };

  // ---------- Delete GIS layer ----------
  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer and its related data?")) return;
    const { error } = await supabase.rpc("delete_gis_layer_cascade", { p_id: id });
    if (error) alert("Failed to delete layer: " + error.message);
    await fetchLayers();
  };

 // ---------- Fit map to visible layers ----------
  const fitVisibleLayers = () => {
    if (!mapRef.current) return;
    const allCoords: [number, number][] = [];

    Object.entries(geojsonById).forEach(([id, fc]) => {
      if (!visible[id]) return;

      // ✅ Flatten all polygons / multipolygons into coordinate pairs
      for (const feature of fc.features) {
        const geom = feature.geometry as Geometry | undefined;
        if (!geom) continue;

        let coords: any[] = [];
        if (geom.type === "Polygon") coords = geom.coordinates.flat(1);
        else if (geom.type === "MultiPolygon") coords = geom.coordinates.flat(2);

        coords.forEach((c) => {
          if (Array.isArray(c) && c.length === 2 && typeof c[0] === "number" && typeof c[1] === "number") {
            allCoords.push([c[1], c[0]]); // flip lon/lat → lat/lon for Leaflet
          }
        });
      }
    });

    if (allCoords.length) {
      try {
        const L = require("leaflet");
        const bounds = L.latLngBounds(allCoords);
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        console.error("fitBounds failed:", err);
      }
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchLayers();
  }, [countryIso]);

  // Recenter map whenever visible layers change
  useEffect(() => {
    fitVisibleLayers();
  }, [visible, geojsonById]);

  // ---------- Map colors ----------
  const layerColors: Record<string, string> = {
    ADM0: "#800026",
    ADM1: "#BD0026",
    ADM2: "#E31A1C",
    ADM3: "#FC4E2A",
    ADM4: "#FD8D3C",
    ADM5: "#FEB24C",
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Layers`,
        group: "country-config",
        description: "Manage uploaded GIS layers and computed metrics.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Country Configuration", href: "/country" },
              { label: `${countryIso} GIS` },
            ]}
          />
        ),
      }}
    >
      {/* -------- Table -------- */}
      <section className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-semibold">Layers</h3>
          <button
            onClick={() => setOpenUpload(true)}
            className="px-3 py-1.5 rounded bg-[#640811] text-white text-sm hover:opacity-90"
          >
            + Upload Layer
          </button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2 text-right">Features</th>
                <th className="px-3 py-2 text-right">Avg Area (km²)</th>
                <th className="px-3 py-2 text-right">Unique Pcodes</th>
                <th className="px-3 py-2 text-right">Missing Names</th>
                <th className="px-3 py-2 text-center">Visible</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.layer_name}</td>
                  <td className="px-3 py-2">{l.admin_level ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{l.unique_pcodes ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{l.missing_names ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!visible[l.id]}
                      onChange={() => {
                        const newVal = !visible[l.id];
                        setVisible((v) => ({ ...v, [l.id]: newVal }));
                        if (newVal && !geojsonById[l.id]) fetchGeoJSON(l);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => deleteLayer(l.id)}
                    >
                      <Trash2 className="inline w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {layers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500 italic">
                    No GIS layers yet. Click “Upload Layer” to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------- Map -------- */}
      {isClient && (
        <section className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={5}
              style={{ height: "600px", width: "100%" }}
              ref={mapRef as any}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
              />
              {layers.map(
                (l) =>
                  visible[l.id] &&
                  geojsonById[l.id] && (
                    <GeoJSON
                      key={l.id}
                      data={geojsonById[l.id]}
                      style={{
                        color: layerColors[l.admin_level || ""] || "#640811",
                        weight: 1,
                        opacity: 0.9,
                      }}
                    />
                  )
              )}
            </MapContainer>
          </div>
        </section>
      )}

      {/* -------- Upload Modal -------- */}
      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}
