"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Button } from "@/components/ui/Button";
import UploadGISModal from "@/components/country/UploadGISModal";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  year: number;
  is_active: boolean;
  dataset_date: string | null;
  source: string | null;
};

type LayerData = {
  name: string;
  level: string;
  geojson: any;
};

export default function GISPage({ params }: { params: { id: string } }) {
  const countryIso = params.id.toUpperCase();
  const [datasets, setDatasets] = useState<GISDatasetVersion[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<Record<string, boolean>>({
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
  });
  const [layerData, setLayerData] = useState<LayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  async function loadDatasets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setDatasets(data || []);
    }
    setLoading(false);
  }

  // Load GeoJSON when layer toggles
  useEffect(() => {
    (async () => {
      const activeLevels = Object.keys(selectedLayers).filter(
        (key) => selectedLayers[key]
      );
      if (activeLevels.length === 0) return setLayerData([]);

      const loaded: LayerData[] = [];
      for (const level of activeLevels) {
        const { data, error } = await supabase
          .from("admin_boundaries")
          .select("geojson, level, name")
          .eq("country_iso", countryIso)
          .eq("level", level)
          .limit(1);

        if (!error && data?.length) {
          loaded.push({
            name: data[0].name,
            level: data[0].level,
            geojson: data[0].geojson,
          });
        }
      }
      setLayerData(loaded);
    })();
  }, [selectedLayers, countryIso]);

  function toggleLayer(level: string) {
    setSelectedLayers((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-500 text-center">
        Loading GIS datasets for {countryIso}...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">GIS Layers for {countryIso}</h2>
          <p className="text-sm text-gray-500">
            Manage and visualize uploaded administrative boundary layers.
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>Upload GIS Dataset</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar controls */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Layers (toggle to show)
          </h3>
          {Object.keys(selectedLayers).map((level) => (
            <label
              key={level}
              className="flex items-center justify-between text-sm"
            >
              <span>{level}</span>
              <input
                type="checkbox"
                checked={selectedLayers[level]}
                onChange={() => toggleLayer(level)}
              />
            </label>
          ))}

          <div className="mt-4 border-t pt-3">
            <h4 className="text-xs text-gray-500 font-semibold mb-1">
              Available Datasets
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
              {datasets.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.title}</span> ({d.year}){" "}
                  {d.is_active && (
                    <span className="text-green-600 font-semibold">● Active</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Map view */}
        <div className="md:col-span-3">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={6}
            style={{ height: "600px", width: "100%" }}
            className="rounded-lg z-0"
            ref={mapRef}
            whenReady={() => {
              const map = mapRef.current;
              if (!map) return;
            }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {layerData.map((layer, idx) => (
              <GeoJSON key={idx} data={layer.geojson} />
            ))}
          </MapContainer>
        </div>
      </div>

      <UploadGISModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        countryIso={countryIso}
        onUploaded={loadDatasets}
      />
    </div>
  );
}
