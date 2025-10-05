"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";

const L = dynamic(() => import("leaflet"), { ssr: false });

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

// ✅ Fix: Explicitly type props as { params: Promise<{ id: string }> }
//     because Next.js 15 now sometimes wraps params in a Promise
export default async function GISPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await Promise.resolve(props.params);
  const countryIso = resolvedParams.id;

  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load dataset versions
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      setVersions(data || []);
    })();
  }, [countryIso]);

  // Load layers
  useEffect(() => {
    (async () => {
      if (!versions.length) return;
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .in(
          "dataset_version_id",
          versions.map((v) => v.id)
        );
      setLayers(data || []);
    })();
  }, [versions]);

  // Initialize map safely
  useEffect(() => {
    if (!mapVisible || !mapContainerRef.current || !L) return;

    // Destroy existing instance if present
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [12.8797, 121.774],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    // Render visible layers
    (async () => {
      for (const layer of layers) {
        try {
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${layer.source.path}`;
          const response = await fetch(url);
          if (!response.ok) continue;
          const geojson = await response.json();
          const geoLayer = L.geoJSON(geojson, {
            style: {
              color: layer.admin_level === "ADM2" ? "#e63946" : "#457b9d",
              weight: 1.2,
              fillOpacity: 0.25,
            },
          });
          geoLayer.addTo(map);
        } catch (err) {
          console.warn("Failed to render layer:", layer.layer_name, err);
        }
      }

      // Fit to visible layers
      const allLayers = Object.values(map._layers);
      const geoLayers = allLayers.filter((l: any) => l.getBounds);
      if (geoLayers.length) {
        const group = L.featureGroup(geoLayers as any);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    })();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapVisible, layers]);

  const headerProps = {
    title: `${countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "View, manage, and visualize uploaded GIS layers.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
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
            className="h-[70vh] w-full rounded-lg border shadow-inner"
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
