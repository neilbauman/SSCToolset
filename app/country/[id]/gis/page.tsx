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
    setLayers(data || []);
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
      {/* Table + Map + Upload modal remain unchanged */}
    </SidebarLayout>
  );
}
