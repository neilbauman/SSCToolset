"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check } from "lucide-react";

// ✅ Static import (fixes build error)
import "leaflet/dist/leaflet.css";

type GISDatasetVersion = {
  id: string;
  title: string;
  source: string | null;
  created_at: string;
  is_active: boolean;
  country_iso: string;
};

type GISLayer = {
  id: string;
  dataset_version_id: string;
  layer_name: string;
  format: string;
  source: { path: string };
  admin_level: string | null;
};

export default function GISPage() {
  // ---- Extract country ISO directly from URL ----
  const pathname = usePathname();
  const countryIso =
    pathname?.split("/country/")[1]?.split("/")[0]?.toUpperCase() ?? "UNK";

  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ---- Load Versions ----
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching versions:", error);
      else setVersions(data || []);
    };
    fetchVersions();
  }, [countryIso]);

  // ---- Load Layers ----
  useEffect(() => {
    const fetchLayers = async () => {
      if (!versions.length) return;
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .in(
          "dataset_version_id",
          versions.map((v) => v.id)
        );
      if (error) console.error("Error fetching layers:", error);
      else setLayers(data || []);
    };
    fetchLayers();
  }, [versions]);

  // ---- Initialize Map ----
  useEffect(() => {
    if (!mapVisible || !mapContainerRef.current) return;

    import("leaflet").then(async (L) => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [12.8797, 121.774],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      for (const layer of layers) {
        try {
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${layer.source.path}`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const geojson = await res.json();

          const color =
            layer.admin_level === "ADM1"
              ? "#003f5c"
              : layer.admin_level === "ADM2"
              ? "#bc5090"
              : "#ffa600";

          const geoLayer = L.geoJSON(geojson, {
            style: {
              color,
              weight: 1.2,
              fillOpacity: 0.25,
            },
          });
          geoLayer.addTo(map);
        } catch (err) {
          console.warn("Failed to render layer:", layer.layer_name, err);
        }
      }

      const drawn = Object.values(map._layers).filter((l: any) => l.getBounds);
      if (drawn.length) {
        const group = L.featureGroup(drawn as any);
        map.fitBounds(group.getBounds(), { padding: [25, 25] });
      }

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapVisible, layers]);

  // ---- Header ----
  const headerProps = {
    title: `${countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and preview uploaded GIS datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // ---- Render ----
  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" /> GIS Dataset Versions
          </h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={() => setMapVisible((v) => !v)}
              className="text-sm text-gray-600 underline"
            >
              {mapVisible ? "Hide Map" : "Show Map"}
            </button>
          </div>
        </div>

        <table className="w-full text-sm border mb-3">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Title</th>
              <th className="border px-2 py-1 text-left">Source</th>
              <th className="border px-2 py-1 text-left">Created</th>
              <th className="border px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td className="border px-2 py-1">{v.title}</td>
                <td className="border px-2 py-1">{v.source}</td>
                <td className="border px-2 py-1">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
                <td className="border px-2 py-1">
                  {v.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mapVisible && (
        <div className="relative w-full">
          <div
            ref={mapContainerRef}
            id="map-container"
            className="h-[70vh] w-full rounded-lg border shadow-inner overflow-hidden"
          />
        </div>
      )}

      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={() => window.location.reload()}
      />
    </SidebarLayout>
  );
}
