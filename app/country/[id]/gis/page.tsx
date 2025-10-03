"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadGISModal from "@/components/country/UploadGISModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type GISLayer = {
  id: string;
  layer_name: string;
  format: string;
  feature_count: number;
  crs: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [gisLayers, setGisLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  const fetchGisLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso);

    if (!error && data) {
      setGisLayers(data as GISLayer[]);
    }
  };

  useEffect(() => {
    fetchGisLayers();
  }, [countryIso]);

  const validCRSCount = gisLayers.filter((r) => r.crs && r.crs.startsWith("EPSG:")).length;
  const validFeatureCount = gisLayers.filter((r) => r.feature_count > 0).length;

  const headerProps = {
    title: `${countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded GIS datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            GIS Summary
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Layers:</strong> {gisLayers.length}
          </p>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload / Replace Dataset
          </button>
        </div>

        <DatasetHealth
          totalUnits={gisLayers.length}
          validCRSCount={validCRSCount}
          validFeatureCount={validFeatureCount}
        />
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Layer Name</th>
              <th className="border px-2 py-1 text-left">Format</th>
              <th className="border px-2 py-1 text-left">Features</th>
              <th className="border px-2 py-1 text-left">CRS</th>
            </tr>
          </thead>
          <tbody>
            {gisLayers.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.layer_name}</td>
                <td className="border px-2 py-1">{r.format}</td>
                <td className="border px-2 py-1">{r.feature_count}</td>
                <td className="border px-2 py-1">{r.crs}</td>
              </tr>
            ))}
            {gisLayers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchGisLayers}
      />
    </SidebarLayout>
  );
}
