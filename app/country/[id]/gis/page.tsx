"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { Trash2 } from "lucide-react";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap } from "leaflet";

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

  const fetchLayers = async () => {
    const { data } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });
    setLayers(data || {});
  };

  const fetchGeoJSON = async (layer: GISLayer) => {
    if (!layer.source?.path) return;
    const bucket = layer.source?.bucket || "gis_raw";
    const { data } = supabase.storage.from(bucket).getPublicUrl(layer.source.path);
    if (!data?.publicUrl) return;
    const res = await fetch(data.publicUrl);
    const json = (await res.json()) as FeatureCollection;
    setGeojsonById((m) => ({ ...m, [layer.id]: json }));
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer and its related data?")) return;
    await supabase.rpc("delete_gis_layer_cascade", { p_layer_id: id });
    await fetchLayers();
  };

  useEffect(() => {
    fetchLayers();
  }, [countryIso]);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Layers`,
        group: "country-config",
        description: "Manage uploaded GIS layers and metrics.",
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

        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2 text-right">Features</th>
              <th className="px-3 py-2 text-right">Avg Area (km²)</th>
              <th className="px-3 py-2 text-right">Centroid</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2">{l.admin_level ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {l.feature_count ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.centroid_lat && l.centroid_lon
                    ? `${l.centroid_lat.toFixed(2)}, ${l.centroid_lon.toFixed(2)}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-[#640811] hover:underline mr-3"
                    onClick={() => {
                      setVisible((v) => ({ ...v, [l.id]: !v[l.id] }));
                      if (!geojsonById[l.id]) fetchGeoJSON(l);
                    }}
                  >
                    {visible[l.id] ? "Hide" : "View"}
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => deleteLayer(l.id)}
                  >
                    <Trash2 className="inline w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Map */}
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
            {layers.map((l) =>
              visible[l.id] && geojsonById[l.id] ? (
                <GeoJSON
                  key={l.id}
                  data={geojsonById[l.id]}
                  style={{
                    color: "#640811",
                    weight: 1,
                    opacity: 0.8,
                  }}
                />
              ) : null
            )}
          </MapContainer>
        </div>
      </section>

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
}"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { Trash2 } from "lucide-react";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap } from "leaflet";

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

  const fetchLayers = async () => {
    const { data } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });
    setLayers(data || {});
  };

  const fetchGeoJSON = async (layer: GISLayer) => {
    if (!layer.source?.path) return;
    const bucket = layer.source?.bucket || "gis_raw";
    const { data } = supabase.storage.from(bucket).getPublicUrl(layer.source.path);
    if (!data?.publicUrl) return;
    const res = await fetch(data.publicUrl);
    const json = (await res.json()) as FeatureCollection;
    setGeojsonById((m) => ({ ...m, [layer.id]: json }));
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer and its related data?")) return;
    await supabase.rpc("delete_gis_layer_cascade", { p_layer_id: id });
    await fetchLayers();
  };

  useEffect(() => {
    fetchLayers();
  }, [countryIso]);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Layers`,
        group: "country-config",
        description: "Manage uploaded GIS layers and metrics.",
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

        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2 text-right">Features</th>
              <th className="px-3 py-2 text-right">Avg Area (km²)</th>
              <th className="px-3 py-2 text-right">Centroid</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2">{l.admin_level ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {l.feature_count ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.centroid_lat && l.centroid_lon
                    ? `${l.centroid_lat.toFixed(2)}, ${l.centroid_lon.toFixed(2)}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-[#640811] hover:underline mr-3"
                    onClick={() => {
                      setVisible((v) => ({ ...v, [l.id]: !v[l.id] }));
                      if (!geojsonById[l.id]) fetchGeoJSON(l);
                    }}
                  >
                    {visible[l.id] ? "Hide" : "View"}
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => deleteLayer(l.id)}
                  >
                    <Trash2 className="inline w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Map */}
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
            {layers.map((l) =>
              visible[l.id] && geojsonById[l.id] ? (
                <GeoJSON
                  key={l.id}
                  data={geojsonById[l.id]}
                  style={{
                    color: "#640811",
                    weight: 1,
                    opacity: 0.8,
                  }}
                />
              ) : null
            )}
          </MapContainer>
        </div>
      </section>

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
