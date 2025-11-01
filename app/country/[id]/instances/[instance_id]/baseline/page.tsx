"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCw, Layers, Database } from "lucide-react";

interface DatasetLayer {
  id: string;
  category: string;
  subcategory: string | null;
  dataset_id: string;
  title?: string;
  dataset_type?: string;
  record_count?: number;
  admin_level?: string;
}

export default function InstanceBaselinePage({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const countryIso = params.id;
  const instanceId = params.instance_id;
  const [layers, setLayers] = useState<DatasetLayer[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBaselineLayers = async () => {
    setLoading(true);
    const { data: linked, error } = await supabase
      .from("instance_layer_summary")
      .select("id, category, subcategory, dataset_id")
      .eq("instance_id", instanceId);
    if (error) return console.error(error);
    if (!linked || linked.length === 0) {
      setLayers([]);
      setLoading(false);
      return;
    }

    // Fetch metadata for all datasets in one go
    const ids = linked.map((l) => l.dataset_id);
    const { data: meta } = await supabase
      .from("unified_datasets")
      .select("dataset_id, title, dataset_type, record_count, admin_level")
      .in("dataset_id", ids);

    const merged = linked.map((l) => ({
      ...l,
      ...(meta?.find((m) => m.dataset_id === l.dataset_id) || {}),
    }));
    setLayers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadBaselineLayers();
  }, [instanceId]);

  const headerProps = {
    title: "Baseline Vulnerability Overview",
    group: "country-config" as const,
    description:
      "Composite overview of the baseline instance — combining underlying vulnerabilities, hazards, and SSC pillars.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Config", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Instances", href: `/country/${countryIso}/instances` },
          { label: "Baseline Overview" },
        ]}
      />
    ),
  };

  // Group datasets by category for visualization
  const grouped = layers.reduce<Record<string, DatasetLayer[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  const chartData = Object.entries(grouped).map(([cat, ds]) => ({
    category: cat,
    count: ds.length,
    totalRecords: ds.reduce((sum, d) => sum + (d.record_count || 0), 0),
  }));

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-6 space-y-6">
        {/* Header controls */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            Instance Composition
          </h2>
          <button
            onClick={loadBaselineLayers}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Chart summary */}
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--gsc-green)" name="Datasets" />
                <Bar dataKey="totalRecords" fill="var(--gsc-blue)" name="Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 italic text-center py-10">
            No datasets linked to this instance yet.
          </p>
        )}

        {/* Dataset list */}
        <div className="bg-white border rounded shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Dataset</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Subcategory</th>
                <th className="px-4 py-2 text-left">Records</th>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-600" />
                    {l.title || l.dataset_id}
                  </td>
                  <td className="px-4 py-2 capitalize">{l.category}</td>
                  <td className="px-4 py-2">{l.subcategory || "—"}</td>
                  <td className="px-4 py-2">{l.record_count || "—"}</td>
                  <td className="px-4 py-2">{l.admin_level || "—"}</td>
                  <td className="px-4 py-2">{l.dataset_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
