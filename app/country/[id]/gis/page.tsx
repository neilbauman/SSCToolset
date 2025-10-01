"use client";

import type { PageProps } from "next";
import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import { Database, ShieldCheck, Pencil } from "lucide-react";

type Country = {
  iso: string;
  name: string;
};

type GISDataset = {
  id: string;
  level: string;
  source?: { name: string; url?: string };
};

export default function GISPage({ params }: PageProps<{ id: string }>) {
  const countryIso = params.id;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<GISDataset[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);

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

  useEffect(() => {
    const fetchGIS = async () => {
      const { data } = await supabase
        .from("gis_datasets")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setDatasets(data as GISDataset[]);
    };
    fetchGIS();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("gis_datasets")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const hasDatasets = datasets.length > 0;

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS / Mapping`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded GIS boundary datasets.",
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
            <Database className="w-5 h-5 text-blue-600" />
            GIS Datasets Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Layers:</strong> {datasets.length}
          </p>
          <ul className="text-sm text-gray-700 mb-2">
            {datasets.map((d) => (
              <li key={d.id}>
                <strong>{d.level}:</strong> {d.source?.name ?? "No source"}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
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
        </div>

        {/* Data Health */}
        <div className="border rounded-lg p-4 shadow-sm relative">
          <div className="absolute top-2 right-2">
            {hasDatasets ? (
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
            <li className={hasDatasets ? "text-green-700" : "text-red-700"}>
              {hasDatasets ? "GIS layers uploaded" : "No GIS layers uploaded"}
            </li>
            <li className="text-yellow-700">
              Alignment with admin units not validated
            </li>
          </ul>
        </div>
      </div>

      {/* Data view placeholder */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-2">GIS Data Explorer</h3>
        <p className="text-gray-500 text-sm italic">
          🚧 Map viewer and dataset inspector to be implemented.
        </p>
      </div>

      {/* Edit Source Modal */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("gis_datasets")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
