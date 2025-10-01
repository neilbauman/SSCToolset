"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import { Users, Pencil } from "lucide-react";

type PopulationRow = {
  id: string;
  country_iso: string;
  pcode: string;
  population: number;
  last_updated: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: { params: { id: string } }) {
  const countryIso = params.id;

  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);

  useEffect(() => {
    const fetchPopulation = async () => {
      const { data } = await supabase.from("population_data").select("*").eq("country_iso", countryIso);
      if (data) setPopulation(data as PopulationRow[]);
    };
    fetchPopulation();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const missingPcodes = population.filter((p) => !p.pcode).length;
  const allHavePcodes = population.length > 0 && missingPcodes === 0;

  const headerProps = {
    title: `${countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            Population Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Rows:</strong> {population.length}
          </p>
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
        <DatasetHealth
          checks={[
            {
              label: allHavePcodes
                ? "All rows linked to valid PCodes"
                : `${missingPcodes} rows missing PCodes`,
              status: allHavePcodes ? "ok" : "fail",
            },
            {
              label: "Projection to current year not applied yet",
              status: "warn",
            },
            {
              label: "Household linkage not provided yet",
              status: "warn",
            },
          ]}
        />
      </div>

      {/* Placeholder for data view */}
      <div className="border rounded-lg p-4 shadow-sm">
        <p className="text-gray-500 italic">
          Population data viewer to be implemented (tables, filters, disaggregation).
        </p>
      </div>

      {/* Edit Source Modal */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase.from("population_data").update({ source: newSource }).eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
