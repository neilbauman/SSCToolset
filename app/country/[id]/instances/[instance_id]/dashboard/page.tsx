"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";

const Map = dynamic(() => import("@/components/Map/SSCMap"), { ssr: false });

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

  // Load ADM2 regions
  const loadAdm2List = async () => {
    const { data, error } = await supabase
      .from("derived_overall_summary")
      .select("admin_pcode_adm2, admin_name_adm2")
      .order("admin_name_adm2", { ascending: true });
    if (error) console.error(error);
    setAdm2List(data || []);
  };

  // Load summary for selected ADM2 regions
  const loadSummary = async () => {
    if (!selectedAdm2.length) return;
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

  // Load map GeoJSON
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
        {/* Filter Section */}
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

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600">Select ADM2 Regions:</label>
          <select
            multiple
            value={selectedAdm2}
            onChange={(e) =>
              setSelectedAdm2(
                Array.from(e.target.selectedOptions, (opt) => opt.value)
              )
            }
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full h-48"
          >
            {adm2List.map((r) => (
              <option key={r.admin_pcode_adm2} value={r.admin_pcode_adm2}>
                {r.admin_name_adm2 || r.admin_pcode_adm2}
              </option>
            ))}
          </select>
        </div>

        {/* Map */}
        {geojson ? (
          <div className="border rounded-md overflow-hidden h-[600px]">
            <Map geojson={geojson} />
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
