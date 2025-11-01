"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  BarChart3,
  Map,
  ArrowLeft,
  Activity,
  Database,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Instance = {
  id: string;
  name: string;
  country_iso: string;
};

type DatasetRow = {
  admin_pcode: string;
  admin_name: string;
  value: number;
  dataset_type: string;
};

export default function BaselinePage() {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [baselineData, setBaselineData] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load instance metadata
  async function fetchInstance() {
    const { data, error } = await supabase
      .from("instances_list")
      .select("id, name, country_iso")
      .eq("id", id)
      .single();
    if (!error && data) setInstance(data as Instance);
  }

  // Load baseline vulnerability data
  async function fetchBaseline() {
    if (!instance) return;
    setLoading(true);

    // Example: join derived + gradient datasets tagged to the country
    const { data, error } = await supabase.rpc("get_country_baseline", {
      p_country_iso: instance.country_iso,
    });

    if (!error && data) setBaselineData(data as DatasetRow[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchInstance();
  }, [id]);

  useEffect(() => {
    if (instance) fetchBaseline();
  }, [instance]);

  const headerProps = {
    title: instance ? `${instance.name} – Baseline Vulnerabilities` : "Loading…",
    group: "country-config" as const,
    description:
      "Explore baseline vulnerability indicators forming the foundation of SSC.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Instances", href: "/instances" },
          instance
            ? { label: instance.name, href: `/instances/${instance.id}` }
            : null,
          { label: "Baseline Vulnerabilities", href: "#" },
        ].filter(Boolean) as { label: string; href: string }[]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="mb-4">
        <Link
          href={`/instances/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[color:var(--gsc-blue)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Instance
        </Link>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Database className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Indicators Used</p>
            <p className="text-lg font-semibold">{baselineData.length > 0 ? 3 : "—"}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Activity className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Admin Levels</p>
            <p className="text-lg font-semibold">ADM3–ADM4</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Map className="w-6 h-6 text-[color:var(--gsc-orange,#f59e0b)]" />
          <div>
            <p className="text-sm text-gray-500">Data Sources</p>
            <p className="text-lg font-semibold">Population, Poverty, Density</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-3">
          Example Vulnerability Distribution
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500 italic">Loading data…</p>
        ) : baselineData.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={baselineData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="admin_name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[25%]">Admin Name</th>
              <th className="px-4 py-2 w-[15%]">Pcode</th>
              <th className="px-4 py-2 w-[15%]">Value</th>
              <th className="px-4 py-2 w-[15%]">Dataset Type</th>
            </tr>
          </thead>
          <tbody>
            {baselineData.map((r) => (
              <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.admin_name}</td>
                <td className="px-4 py-2 text-gray-600">{r.admin_pcode}</td>
                <td className="px-4 py-2 font-semibold">
                  {r.value?.toFixed(1) ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-600 capitalize">
                  {r.dataset_type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}
