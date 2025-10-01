"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import { Map, ShieldCheck, Pencil } from "lucide-react";

type Country = {
  iso: string;
  name: string;
};

export default function GISPage({ params }: any) {
  const countryIso = params?.id as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso, name")
        .eq("iso", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch GIS dataset source
  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("gis_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  // Health checks (placeholder)
  const hasBoundaries = false;
  const alignedWithAdmins = false;

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS / Mapping`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded GIS datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS / Mapping" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health */}
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
          <p className="text-sm text-gray-700 mb-2">
            <strong>Dataset Source:</strong>{" "}
            {source ? (
              source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {source.name}
                </a>
              ) : (
                source.name
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

        {/* Health */}
        <div className="border rounded-lg p-4 shadow-sm relative">
          <div className="absolute top-2 right-2">
            {hasBoundaries ? (
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                uploaded
              </span>
            ) : (
              <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                missing
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
          </h2>
          <ul className="text-sm list-disc pl-6">
            <li className={hasBoundaries ? "text-green-700" : "text-red-700"}>
              {hasBoundaries ? "Boundary files uploaded" : "No boundaries uploaded"}
            </li>
            <li className={alignedWithAdmins ? "text-green-700" : "text-yellow-700"}>
              {alignedWithAdmins
                ? "Aligned with admin units"
                : "Not yet aligned with admin units"}
            </li>
          </ul>
        </div>
      </div>

      {/* Placeholder Data View */}
      <div className="border rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600 italic">
          🚧 GIS dataset view coming soon.
        </p>
      </div>

      {/* Edit Source Modal */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("gis_data")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
