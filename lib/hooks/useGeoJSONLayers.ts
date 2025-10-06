import { useState, useEffect } from "react";

/**
 * Fetches and caches GeoJSON data for visible GIS layers.
 * Keeps build type-safe and rendering clean.
 */
export function useGeoJSONLayers(
  layers: any[],
  visible: Record<number, boolean>
) {
  const [geojsons, setGeojsons] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const results: Record<string, any> = {};

      await Promise.all(
        layers.map(async (layer) => {
          // only fetch visible layers
          if (!visible[layer.admin_level_int]) return;

          const url = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/gis_raw/${layer.source?.path}`;

          try {
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              results[layer.id] = data;
            }
          } catch (err) {
            console.error(`Failed to load GeoJSON for ${layer.layer_name}`, err);
          }
        })
      );

      setGeojsons(results);
    };

    fetchAll();
  }, [layers, visible]);

  return geojsons;
}
