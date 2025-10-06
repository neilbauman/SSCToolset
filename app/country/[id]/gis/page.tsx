"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Button } from "@/components/ui/Button";
import UploadGISModal from "@/components/country/UploadGISModal";
import PageHeader from "@/components/layout/PageHeader";
import SidebarLayout from "@/components/layout/SidebarLayout";
import type { Database } from "@/lib/types/database";
import { toast } from "sonner";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then(m => m.ZoomControl), { ssr: false });

type GISDataset = Database["public"]["Tables"]["gis_dataset_versions"]["Row"];

interface Props {
  params: { id: string };
}

export default function GISPage({ params }: Props) {
  const { id: countryIso } = params;
  const [datasets, setDatasets] = useState<GISDataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<GISDataset | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
  });
  const [geojsonData, setGeojsonData] = useState<Record<string, any | null>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const mapRef = useRef<any>(null);

  // Fetch dataset versions
  useEffect(() => {
    async function fetchDatasets() {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("year", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Failed to load GIS datasets.");
        return;
      }

      setDatasets(data || []);
      const active = data?.find(d => d.is_active);
      if (active) setActiveDataset(active);
    }

    fetchDatasets();
  }, [countryIso]);

  // Toggle layer
  async function handleLayerToggle(layer: string) {
    const newState = !layers[layer];
    setLayers(prev => ({ ...prev, [layer]: newState }));

    if (newState) {
      try {
        const filePath = `${countryIso}/gis/${layer}.geojson`;
        const { data, error } = await supabase.storage.from("gis").download(filePath);
        if (error) throw error;

        const text = await data.text();
        const json = JSON.parse(text);
        setGeojsonData(prev => ({ ...prev, [layer]: json }));
      } catch (err: any) {
        console.error(err);
        toast.error(`Failed to load ${layer} layer.`);
      }
    } else {
      setGeojsonData(prev => ({ ...prev, [layer]: null }));
    }
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title={`GIS Layers for ${countryIso.toUpperCase()}`}
          description="Manage and visualize uploaded administrative boundary layers."
          action={
            <Button className="bg-[color:var(--gsc-red)] text-white" onClick={() => setModalOpen(true)}>
              Upload GIS Dataset
            </Button>
          }
        />

        <div className="flex flex-1 gap-4 mt-4">
          {/* Sidebar for Layers */}
          <div className="w-72 p-4 bg-white border rounded-lg overflow-y-auto">
            <h4 className="font-semibold mb-2">Layers (toggle to show)</h4>
            <div className="space-y-2 mb-4">
              {Object.keys(layers).map(layer => (
                <label key={layer} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layers[layer]}
                    onChange={() => handleLayerToggle(layer)}
                  />
                  {layer}
                </label>
              ))}
            </div>

            <h4 className="font-semibold mb-1">Available Datasets</h4>
            {datasets.length === 0 && <p className="text-xs text-gray-500">No datasets uploaded yet.</p>}
            <ul className="text-sm space-y-1">
              {datasets.map(ds => (
                <li key={ds.id} className="flex items-center justify-between">
                  <span>
                    {ds.title} ({ds.year})
                  </span>
                  {ds.is_active && <span className="text-green-600 text-xs">● Active</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Map Display */}
          <div className="flex-1">
            <MapContainer
              center={[12.8797, 121.774]} // Philippines center
              zoom={6}
              scrollWheelZoom={true}
              style={{ height: "600px", width: "100%" }}
              whenReady={(event) => {
                mapRef.current = event.target;
              }}
              zoomControl={false}
              className="rounded-lg z-0"
            >
              <ZoomControl position="topright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {Object.entries(geojsonData)
                .filter(([_, data]) => !!data)
                .map(([key, data]) => (
                  <GeoJSON key={key} data={data!} />
                ))}
            </MapContainer>
          </div>
        </div>

        <UploadGISModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          countryIso={countryIso}
          onUploaded={() => window.location.reload()}
        />
      </div>
    </SidebarLayout>
  );
}
