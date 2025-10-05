"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, ChevronDown, ChevronUp } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean;
  created_at: string;
};

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const mapRef = useRef<L.Map | null>(null);

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);

  // ---- Load Country ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  // ---- Load Versions ----
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading GIS versions:", error);
      return;
    }

    const list = (data || []) as GISDatasetVersion[];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    setActiveVersion(active?.id || null);
    if (active) await fetchLayers(active.id);
  };

  // ---- Load Layers ----
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error loading GIS layers:", error);
      return;
    }

    setLayers(data || []);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // ---- Initialize Map ----
  useEffect(() => {
    const container = L.DomUtil.get("map-container") as HTMLElement & {
      _leaflet_id?: number;
    };
    if (container && container._leaflet_id) container._leaflet_id = undefined;

    const map = L.map("map-container", {
      center: [12.8797, 121.774],
      zoom: 5,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    setTimeout(() => map.invalidateSize(), 400);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
    };
  }, [countryIso]);

  // ---- Load GeoJSON Boundaries ----
  useEffect(() => {
    const loadGeoJSON = async () => {
      if (!activeVersion || !mapRef.current) return;
      if (!layers.length) return;

      const layer = layers[0];
      const path = layer.source?.path;
      if (!path) return;

      try {
        const { data: urlData } = supabase.storage
          .from("gis")
          .getPublicUrl(path);

        if (!urlData?.publicUrl) {
          console.warn("No public URL found for GIS layer:", layer.layer_name);
          return;
        }

        const res = await fetch(urlData.publicUrl);
        const geo = await res.json();

        if (!geo || !geo.features) {
          console.error("Invalid GeoJSON object:", geo);
          return;
        }

        const geoLayer = L.geoJSON(geo, {
          style: {
            color: "#c62828",
            weight: 1,
            fillColor: "#ef9a9a",
            fillOpacity: 0.3,
          },
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(geoLayer.getBounds());
      } catch (err) {
        console.error("Error loading GeoJSON:", err);
      }
    };

    loadGeoJSON();
  }, [layers, activeVersion]);

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description:
      "Manage and inspect uploaded GIS datasets aligned to administrative boundaries.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Layers</th>
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">{v.year || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {layers.length}
                  </td>
                  <td className="border px-2 py-1">
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-green-600 text-white">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200">
                        —
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => setMapVisible(!mapVisible)}
                      className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1"
                    >
                      {mapVisible ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Hide Map
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Show Map
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No GIS versions uploaded yet.</p>
        )}
      </div>

      {/* Collapsible Map Section */}
      {mapVisible && (
        <div className="w-full h-[650px] mb-8 rounded-lg border shadow-sm overflow-hidden relative bg-gray-50">
          <div id="map-container" className="w-full h-full" />
        </div>
      )}

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}
