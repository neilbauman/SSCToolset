"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Activity,
  BarChart3,
  Layers,
  Map,
  Target,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

type InstanceMeta = {
  id: string;
  name: string;
  description: string | null;
  type: "baseline" | "nowcast" | "forecast" | "scenario";
  status: "draft" | "published";
  admin_level: string | null;
  country_iso: string;
  country_name?: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export default function InstancePage() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<InstanceMeta | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchInstance() {
    setLoading(true);
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) setMeta(data as InstanceMeta);
    setLoading(false);
  }

  useEffect(() => {
    if (id) fetchInstance();
  }, [id]);

  const headerProps = {
    title: meta ? `${meta.name}` : "Loading…",
    group: "country-config" as const,
    description: meta
      ? `Instance type: ${meta.type} — Country: ${meta.country_iso}`
      : "Loading instance details…",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          meta?.country_iso
            ? { label: meta.country_iso, href: `/country/${meta.country_iso}` }
            : null,
          { label: "Instances", href: `/country/${meta?.country_iso}/instances` },
          { label: meta?.name || "Instance", href: "#" },
        ].filter(Boolean) as { label: string; href: string }[]}
      />
    ),
  };

  if (loading) {
    return (
      <SidebarLayout headerProps={headerProps}>
        <div className="flex justify-center items-center h-64 text-gray-500 italic">
          Loading instance details…
        </div>
      </SidebarLayout>
    );
  }

  if (!meta) {
    return (
      <SidebarLayout headerProps={headerProps}>
        <div className="flex justify-center items-center h-64 text-gray-500 italic">
          Instance not found.
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Navigation back */}
      <div className="mb-4">
        <Link
          href={`/country/${meta.country_iso}/instances`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[color:var(--gsc-blue)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Instances
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Instance Type</p>
            <p className="text-lg font-semibold capitalize">{meta.type}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Layers className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Admin Level</p>
            <p className="text-lg font-semibold">{meta.admin_level || "—"}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Activity className="w-6 h-6 text-[color:var(--gsc-orange,#f59e0b)]" />
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p
              className={`text-lg font-semibold ${
                meta.status === "published"
                  ? "text-green-700"
                  : "text-yellow-700"
              }`}
            >
              {meta.status}
            </p>
          </div>
        </div>
      </div>

      {/* Description and metadata */}
      {meta.description && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Description
          </h3>
          <p className="text-sm text-gray-600">{meta.description}</p>
        </div>
      )}

      {/* Analysis Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/instances/${id}/baseline`}
          className="border rounded-lg p-4 hover:shadow-md transition flex flex-col items-start gap-2"
        >
          <Map className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <h3 className="font-semibold text-gray-800">Baseline Vulnerabilities</h3>
          <p className="text-sm text-gray-500">
            Explore underlying vulnerabilities (poverty, population, exposure).
          </p>
        </Link>

        <Link
          href={`/instances/${id}/hazards`}
          className="border rounded-lg p-4 hover:shadow-md transition flex flex-col items-start gap-2"
        >
          <AlertTriangle className="w-6 h-6 text-[color:var(--gsc-orange,#f59e0b)]" />
          <h3 className="font-semibold text-gray-800">Hazards & Risks</h3>
          <p className="text-sm text-gray-500">
            Overlay external hazards such as earthquakes, conflict, or typhoons.
          </p>
        </Link>

        <Link
          href={`/instances/${id}/ssc`}
          className="border rounded-lg p-4 hover:shadow-md transition flex flex-col items-start gap-2"
        >
          <BarChart3 className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <h3 className="font-semibold text-gray-800">Shelter Severity (SSC)</h3>
          <p className="text-sm text-gray-500">
            Compute and visualize the composite SSC score for this instance.
          </p>
        </Link>
      </div>
    </SidebarLayout>
  );
}
