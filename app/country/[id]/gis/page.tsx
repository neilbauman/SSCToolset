"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Map, ShieldCheck, Upload, Pencil } from "lucide-react";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";

type Country = {
  iso: string;
  name: string;
};

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: "csv" | "geojson" | string;
  feature_count?: number | null;
  crs?: string | null;
  source?: { name: string; url?: string } | null;
};

export default function GISPage({ params }: any) {
  const countryIso = params?.id as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openSource, setOpenSource] = useState(false);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);

  useEffect(() => {
    const loadCountry = async () => {
      const { data } = await supabase.from("countries").select("iso,name").eq("iso", countryIso).single();
      if (data) setCountry(data as Country);
    };
    loadCountry();
  }, [countryIso]);

  useEffect(() => {
    const loadLayers = async () => {
      const { data, error } = await supabase.from("gis_layers").select("*").eq("country_iso", countryIso);
      if (error) {
        // Table might not exist yet; keep empty
        setLayers([]);
        return;
      }
      setLayers((data || []) as GISLayer[]);
      if (data && data.length > 0 && data[0].source) setSource(data[0].source as any);
    };
    loadLayers();
  }, [countryIso]);

  // Summary values
  const totalLayers = layers.length;
  const totalFeatures = layers.reduce((sum, L) => sum + (L.feature_count || 0), 0);

  // Health
  const hasSource = !!source;
  const hasCRS = layers.every((L) => !!L.crs);
  const statusBadge =
    totalLayers > 0 && hasCRS ? "uploaded" : totalLayers > 0 ? "partial" : "missing";

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS / Mapping`,
    group: "country-config" as const,
    description: "Upload and inspect GIS boundary layers and mapping assets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso },
          { label: "GIS / Mapping" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Map className="w-5 h-5 text-blue-600" />
            GIS Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700">
            <strong>Total Layers:</strong> {totalLayers}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Total Features:</strong> {totalFeatures.toLocaleString()}
          </p>

          <div className="flex items-center justify-between mt-3">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {hasSource ? (
                source?.url ? (
                  <a href={source?.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source?.name}
                  </a>
                ) : (
                  source?.name
                )
              ) : (
                <span className="italic text-gray-500">Empty</span>
              )}
            </p>
            <button
              onClick={() => setOpenSource(true)}
              className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
        </div>

        {/* Data Health */}
        <div className="border rounded-lg p-4 shadow-sm relative">
          <div className="absolute top-2 right-2">
            {statusBadge === "uploaded" ? (
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">uploaded</span>
            ) : statusBadge === "partial" ? (
              <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">partial</span>
            ) : (
              <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">missing</span>
            )}
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
          </h2>
          <ul className="text-sm list-disc pl-6">
            <li className={hasCRS ? "text-green-700" : "text-red-700"}>
              {hasCRS ? "CRS defined for all layers" : "Missing CRS on some layers"}
            </li>
            <li className="text-yellow-700">Linkage to Admin Units not validated yet</li>
            <li className={hasSource ? "text-green-700" : "text-red-700"}>
              {hasSource ? "Source provided" : "Source not set"}
            </li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOpenUpload(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
        >
          <Upload className="w-4 h-4" />
          Upload GIS (CSV / GeoJSON)
        </button>
      </div>

      {/* Simple Layers Table */}
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
            {layers.map((L) => (
              <tr key={L.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{L.layer_name}</td>
                <td className="border px-2 py-1 uppercase">{L.format}</td>
                <td className="border px-2 py-1">{L.feature_count?.toLocaleString() ?? "-"}</td>
                <td className="border px-2 py-1">{L.crs ?? "-"}</td>
              </tr>
            ))}
            {layers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No layers uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          const { data } = await supabase.from("gis_layers").select("*").eq("country_iso", countryIso);
          setLayers((data || []) as GISLayer[]);
        }}
      />

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase.from("gis_layers").update({ source: newSource }).eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
