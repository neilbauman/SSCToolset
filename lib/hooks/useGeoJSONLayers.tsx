"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";

/** GISLayer type definition */
export interface GISLayer {
  id: string;
  layer_name: string;
  admin_level: string | null;
  admin_level_int: number | null;
  source?: { path?: string; url?: string | null } | null;
  crs?: string | null;
  feature_count?: number | null;
}

/** Hook parameters */
interface UseGeoJSONLayersParams {
  supabase: SupabaseClient<any>;
  layers: GISLayer[];
  mapRef: React.MutableRefObject<L.Map | null>;
}

/** Hook return type */
export function useGeoJSONLayers({ supabase, layers, mapRef }: UseGeoJSONLayersParams) {
  const [geoJsonLayers, setGeoJsonLayers] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (!layers || layers.length === 0) {
      setGeoJsonLayers([]);
      return;
    }

    let cancelled = false;

    const loadLayers = async () => {
      const loaded: JSX.Element[] = [];

      for (const layer of layers) {
        try {
          if (!layer.source?.path) continue;

          const url = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/${layer.source.path}`;
          const response = await fetch(url);
          if (!response.ok) continue;

          const geojson: GeoJsonObject = await response.json();
          if (!geojson) continue;

          loaded.push(
            <GeoJSON
              key={layer.id}
              data={geojson}
              style={{
                color: "#C72B2B",
                weight: 1,
                fillOpacity: 0.2,
              }}
              onEachFeature={(_, leafletLayer) => {
                leafletLayer.bindTooltip(layer.layer_name);
              }}
            />
          );
        } catch (err) {
          console.error("Failed to load layer:", layer.layer_name, err);
        }
      }

      if (!cancelled) setGeoJsonLayers(loaded);
    };

    loadLayers();

    return () => {
      cancelled = true;
    };
  }, [layers, supabase]);

  return { geoJsonLayers };
}

export default useGeoJSONLayers;
