"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Globe, Layers, Calendar } from "lucide-react";

type Instance = {
  id: string;
  title: string;
  description?: string;
  type: string;
  created_at: string;
};

export default function CountryInstancesPage() {
  const params = useParams();
  const countryIso = params.id as string;

  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) setInstances(data);
    setLoading(false);
  };

  useEffect(() => {
    if (countryIso) fetchInstances();
  }, [countryIso]);

  const headerProps = {
    title: "SSC Instances",
    group: "country-config" as const,
    description:
      "View and manage SSC analytical instances for this country — including baseline, hazard, and response analyses.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: `${countryIso}`, href: `/country/${countryIso}` },
          { label: "Instances" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Globe className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Country ISO</p>
            <p className="text-lg font-semibold">{countryIso}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Layers className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Total Instances</p>
            <p className="text-lg font-semibold">{instances.length}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex justify-end items-center">
          <Link
            href={`/country/${countryIso}/instances/new`}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Instance
          </Link>
        </div>
      </div>

      {/* Instances Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[35%]">Title</th>
              <th className="px-4 py-2 w-[20%]">Type</th>
              <th className="px-4 py-2 w-[25%]">Created</th>
              <th className="px-4 py-2 w-[20%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr key={inst.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/instances/${inst.id}`}
                    className="text-blue-700 hover:underline font-medium"
                  >
                    {inst.title}
                  </Link>
                  {inst.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {inst.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2 capitalize">{inst.type}</td>
                <td className="px-4 py-2 flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(inst.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/instances/${inst.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}

            {instances.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500 italic">
                  No instances defined yet for this country.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}
