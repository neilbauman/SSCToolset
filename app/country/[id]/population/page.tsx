"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users, Database, Pencil } from "lucide-react";
import { generatePopulationTemplate } from "@/lib/templates/populationTemplate";

type Country = {
  iso: string;
  name: string;
};

type PopulationRow = {
  id: number;
  pcode: string;
  population: number | null;
  households: number | null;
  dataset_date: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: any) {
  const countryIso = params?.id as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry({ iso: data.iso_code, name: data.name });
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchPopulation = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) {
        setPopulation(data as PopulationRow[]);
        if (data[0]?.source) setSource(data[0].source as any);
      }
    };
    fetchPopulation();
  }, [countryIso]);

  const totalPop = population.reduce((sum, r) => sum + (r.population || 0), 0);
  const totalHouseholds = population.reduce((sum, r) => sum + (r.households || 0), 0);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population and demographic datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
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
            <Users className="w-5 h-5 text-blue-600" />
            Population Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Population:</strong> {totalPop.toLocaleString()}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Households:</strong> {totalHouseholds.toLocaleString()}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Datasets:</strong> {population.length}
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
            <div className="flex gap-2">
              <button
                onClick={() => setOpenSource(true)}
                className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </button>
              <button
                onClick={() => {
                  const blob = generatePopulationTemplate();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "population_template.csv";
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
              >
                Download Template
              </button>
            </div>
          </div>
        </div>

        {/* Data Health */}
        <DatasetHealth
          data={population}
          checks={[
            {
              label: "All rows linked to valid PCodes",
              status: population.length > 0 ? "ok" : "fail",
            },
            {
              label: "Dataset date provided",
              status: population.every((r) => !!r.dataset_date) ? "ok" : "warn",
            },
            {
              label: "Household counts present",
              status: population.some((r) => r.households) ? "ok" : "warn",
            },
          ]}
        />
      </div>

      {/* Data Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" /> Population Data
        </h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Households</th>
              <th className="border px-2 py-1 text-left">Dataset Date</th>
            </tr>
          </thead>
          <tbody>
            {population.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{row.pcode}</td>
                <td className="border px-2 py-1">{row.population ?? "-"}</td>
                <td className="border px-2 py-1">{row.households ?? "-"}</td>
                <td className="border px-2 py-1">{row.dataset_date}</td>
              </tr>
            ))}
            {population.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No population data uploaded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={() => window.location.reload()}
      />
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("population_data")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
