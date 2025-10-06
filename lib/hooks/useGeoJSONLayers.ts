"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { GeoJSON } from "react-leaflet";

type GISLayer = {
  id: string;
  source?: { path?: string | null } | null;
  admin_level_int: number;
  admin_level?: string | null;
};

interface UseGeoJSONLayersProps {
  supabase: any;
  layers: GISLayer[];
  mapRef: React.MutableRefObject<L.Map | null>;
  visible: Record<number, boolean>;
}

export function useGeoJSONLayers({
  supabase,
  layers,
  mapRef,
  visible,
}: UseGeoJSONLayersProps) {
  const [geoJsonLayers, setGeoJsonLayers] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (!mapRef.current || !layers?.length) return;

    const loadLayers = async () => {
      const newLayers: JSX.Element[] = [];

      for (const layer of layers) {
        if (!visible[layer.admin_level_int]) continue;
        if (!layer.source?.path) continue;

        try {
          const { data, error } = await supabase.storage
            .from("gis_raw")
            .download(layer.source.path);

          if (error || !data) continue;

          const text = await data.text();
          const geojson = JSON.parse(text);

          newLayers.push(
            <GeoJSON
              key={layer.id}
              data={geojson}
              style={{
                color: "#C72B2B",
                weight: 1,
                fillOpacity: 0.2,
              }}
            />
          );
        } catch (err) {
          console.error("Error loading GeoJSON layer:", err);
        }
      }

      setGeoJsonLayers(newLayers);
    };

    loadLayers();
  }, [layers, visible, supabase, mapRef]);

  return { geoJsonLayers };
}
