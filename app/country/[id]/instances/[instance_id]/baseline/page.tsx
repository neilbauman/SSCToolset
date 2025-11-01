"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  RefreshCw,
  FileDown,
  Layers,
  BarChart3,
  AlertTriangle,
  Home,
} from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface DatasetLink {
  id: string;
  dataset_title: string;
  category: string;
  subcategory: string | null;
  dataset_type: string;
  admin_level: string;
  record_count?: number;
}

export default function BaselinePage({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const countryIso = params.id;
  const instanceId = params.instance_id;
  const [instance, setInstance] = useState<any>(null);
  const [linked, setLinked] = useState<DatasetLink[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Load instance metadata
  async function loadInstance() {
    const { data } = await supabase
      .from("instances_list")
      .select("*")
      .eq("id", instanceId)
      .single();
    setInstance(data);
  }

  // Load linked datasets for this instance
  async function loadLinked() {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    if (error) console.error(error);
    setLinked(data || []);
    setRefreshing(false);
  }

  // Quick composite indicator: count by category
  useEffect(() => {
    if (!linked.length) return;
    const categories = ["vulnerability", "hazard", "ssc_pillar"];
    const summary = categories.map((c) => ({
      name:
        c === "vulnerability"
          ? "Underlying Vulnerabilities"
          : c === "hazard"
          ? "Hazards"
          : "SSC Pillars",
      value: linked.filter((d) => d.category === c).length,
    }));
    setStats(summary);
  }, [linked]);

  useEffect(() => {
    loadInstance();
    loadLinked();
  }, [instanceId]);

  const COLORS = ["#f59e0b", "#ef4444", "#2563eb"];

  const headerProps = {
    title: `${instance?.title || "Baseline"} – Analysis`,
    group: "country-config" as const,
    description:
      instance?.description ||
      "Baseline analysis integrates vulnerability, hazard, and SSC pillar datasets into a national composite view.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Instances", href: `/country/${countryIso}/instances` },
          { label: instance?.title || "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
          { label: "Baseline", href: "#" },
        ]}
      />
    ),
    tool: "baseline",
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-6 space-y-6">
        {/* Overview */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {instance?.title || "Baseline"} Overview
          </h2>
          <div className="flex gap-2">
            <button
              onClick={loadLinked}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => alert("Export to PDF coming soon.")}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary visualization */}
        {stats && (
          <div className="h-64 w-full bg-white rounded-lg shadow border flex justify-center items-center">
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={stats}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label
                >
                  {stats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Linked Datasets by Category */}
        <div className="space-y-6">
          {["vulnerability", "hazard", "ssc_pillar"].map((cat) => {
            const label =
              cat === "vulnerability"
                ? "Underlying Vulnerabilities"
                : cat === "hazard"
                ? "Hazards"
                : "SSC Pillars (P1–P3)";
            const icon =
              cat === "vulnerability" ? (
                <Layers className="w-4 h-4 text-yellow-600" />
              ) : cat === "hazard" ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <Home className="w-4 h-4 text-blue-600" />
              );
            const group = linked.filter((d) => d.category === cat);
            return (
              <div key={cat}>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  {icon} {label}
                </h3>
                <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Dataset</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Level</th>
                        <th className="px-3 py-2 text-left">Records</th>
                        <th className="px-3 py-2 text-left">Subcategory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center italic text-gray-500 py-3"
                          >
                            No datasets in this category.
                          </td>
                        </tr>
                      ) : (
                        group.map((g) => (
                          <tr key={g.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 text-[color:var(--gsc-blue)] font-medium">
                              {g.dataset_title}
                            </td>
                            <td className="px-3 py-2 capitalize">
                              {g.dataset_type}
                            </td>
                            <td className="px-3 py-2">{g.admin_level}</td>
                            <td className="px-3 py-2">
                              {g.record_count || "—"}
                            </td>
                            <td className="px-3 py-2">
                              {g.subcategory || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SidebarLayout>
  );
}
