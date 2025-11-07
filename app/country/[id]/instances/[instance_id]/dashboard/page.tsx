"use client";

import { useEffect, useState, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCw } from "lucide-react";

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
        "Filter affected regions, view consolidated SSC vulnerability and caseload summary.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country", href: `/country/${countryId}` },
            { label: "Instances", href: `/country/${countryId}/instances` },
            { label: "Framework" },
          ]}
        />
      ),
    }),
    [countryId]
  );

  const [adm2List, setAdm2List] = useState<{ admin_pcode_adm2: string; admin_name_adm2: string }[]>([]);
  const [selectedAdm2, setSelectedAdm2] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load all ADM2 regions that have summary data
  const loadAdm2List = async () => {
    const { data, error } = await supabase
      .from("derived_overall_summary")
      .select("admin_pcode_adm2, admin_name_adm2")
      .order("admin_name_adm2", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setAdm2List(data || []);
  };

  // Load summary for selected ADM2
  const loadSummary = async (adm2: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("derived_overall_summary")
        .select("*")
        .eq("admin_pcode_adm2", adm2)
        .single();
      if (error) throw error;
      setSummary(data);
    } catch (e) {
      console.error(e);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdm2List();
  }, []);

  useEffect(() => {
    if (selectedAdm2) loadSummary(selectedAdm2);
  }, [selectedAdm2]);

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-5xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Affected Area Filter
          </h2>
          <button
            onClick={() => {
              loadAdm2List();
              if (selectedAdm2) loadSummary(selectedAdm2);
            }}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label htmlFor="adm2" className="text-sm text-gray-600">
            Select ADM2 Region:
          </label>
          <select
            id="adm2"
            value={selectedAdm2}
            onChange={(e) => setSelectedAdm2(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-80"
          >
            <option value="">— Select Region —</option>
            {adm2List.map((r) => (
              <option key={r.admin_pcode_adm2} value={r.admin_pcode_adm2}>
                {r.admin_name_adm2 || r.admin_pcode_adm2}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading summary…</p>
        ) : summary ? (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              Summary for {summary.admin_name_adm2}
            </h3>
            <table className="min-w-full border text-sm">
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Total population
                  </td>
                  <td className="px-3 py-2 text-right text-gray-800">
                    {summary.total_population.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Population (score ≥ 3)
                  </td>
                  <td className="px-3 py-2 text-right text-gray-800">
                    {summary.pop_score_3plus.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Poor population (score ≥ 3)
                  </td>
                  <td className="px-3 py-2 text-right text-gray-800">
                    {summary.poor_score_3plus.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : selectedAdm2 ? (
          <p className="text-gray-500 text-sm mt-4">
            No data available for this region.
          </p>
        ) : (
          <p className="text-gray-500 text-sm mt-4">
            Select a region to view summary data.
          </p>
        )}
      </div>
    </SidebarLayout>
  );
}
