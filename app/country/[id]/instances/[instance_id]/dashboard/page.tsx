"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

export default function SSCDashboard({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const { id: countryId, instance_id } = params;

  const headerProps = useMemo(
    () => ({
      title: "SSC Consolidated Dashboard",
      group: "country-config" as const,
      description:
        "Filter affected ADM2 regions, visualize vulnerability, and view consolidated summaries.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country", href: `/country/${countryId}` },
            { label: "Instances", href: `/country/${countryId}/instances` },
            { label: "Dashboard" },
          ]}
        />
      ),
    }),
    [countryId]
  );

  const [adm2List, setAdm2List] = useState<any[]>([]);
  const [selectedAdm2, setSelectedAdm2] = useState<string[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [geojson, setGeojson] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load ADM2 list
  const loadAdm2List = async () => {
    const { data, error } = await supabase
      .from("derived_overall_summary")
      .select("admin_pcode_adm2, admin_name_adm2")
      .order("admin_name_adm2", { ascending: true });
    if (error) console.error(error);
    setAdm2List(data || []);
  };

  // Load summary for selected ADM2
  const loadSummary = async () => {
    if (!selectedAdm2.length) {
      setSummary([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("derived_overall_summary")
        .select("*")
        .in("admin_pcode_adm2", selectedAdm2);
      if (error) throw error;
      setSummary(data || []);
    } catch (e) {
      console.error(e);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  // Load GeoJSON map
  const loadMap = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_geojson_for_result_table",
        {
          p_iso: "PHL",
          p_result_table: "derived.derived_overall_adm3",
          p_admin_level: "ADM3",
          p_limit: 100000,
        }
      );
      if (error) throw error;
      setGeojson(data);
    } catch (e) {
      console.error(e);
      setGeojson(null);
    }
  };

  useEffect(() => {
    loadAdm2List();
    loadMap();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [selectedAdm2]);

  const toggleAdm2 = (code: string) => {
    setSelectedAdm2((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
        {/* Filter Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Affected Area Filter
          </h2>
          <button
            onClick={() => {
              loadAdm2List();
              loadSummary();
              loadMap();
            }}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Checkbox Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 border p-3 rounded-md max-h-[300px] overflow-y-auto">
          {adm2List.map((r) => (
            <label
              key={r.admin_pcode_adm2}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedAdm2.includes(r.admin_pcode_adm2)}
                onChange={() => toggleAdm2(r.admin_pcode_adm2)}
                className="rounded border-gray-400"
              />
              {r.admin_name_adm2 || r.admin_pcode_adm2}
            </label>
          ))}
        </div>

        {/* Map */}
        {geojson ? (
          <div className="border rounded-md overflow-hidden h-[600px]">
            <MapContainer
              style={{ height: "100%", width: "100%" }}
              center={[12.8797, 121.774]} // Philippines center
              zoom={6}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geojson && (
                <GeoJSON
                  data={geojson}
                  style={(feature: any) => {
                    const score = feature?.properties?.score || 0;
                    const colors = ["#d4d4d4", "#fee0d2", "#fcbba1", "#fb6a4a", "#de2d26", "#a50f15"];
                    return {
                      color: "#555",
                      weight: 0.5,
                      fillColor: colors[score] || "#ccc",
                      fillOpacity: 0.7,
                    };
                  }}
                />
              )}
            </MapContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading map…</p>
        )}

        {/* Summary Table */}
        {loading ? (
          <p className="text-gray-500 text-sm">Loading summary…</p>
        ) : summary.length ? (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              Summary for Selected ADM2 Regions
            </h3>
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">ADM2 Name</th>
                  <th className="px-3 py-2 text-right">Total Population</th>
                  <th className="px-3 py-2 text-right">Pop (Score ≥ 3)</th>
                  <th className="px-3 py-2 text-right">Poor Pop (Score ≥ 3)</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={r.admin_pcode_adm2} className="border-t">
                    <td className="px-3 py-2">{r.admin_name_adm2}</td>
                    <td className="px-3 py-2 text-right">
                      {r.total_population?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.pop_score_3plus?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.poor_score_3plus?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select one or more regions.</p>
        )}
      </div>
    </SidebarLayout>
  );
}
