"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  population: number;
  year: number;
  dataset_date: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  const fetchPopulation = async () => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso);

    if (!error && data) {
      setPopulation(data as PopulationRow[]);
    }
  };

  useEffect(() => {
    fetchPopulation();
  }, [countryIso]);

  const validPopulationCount = population.filter(
    (p) => p.population && p.population > 0
  ).length;

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
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-gray-600" />
            Population Summary
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Records:</strong> {population.length}
          </p>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload / Replace Dataset
          </button>
        </div>

        <DatasetHealth
          totalUnits={population.length}
          validPopulationCount={validPopulationCount}
        />
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Year</th>
              <th className="border px-2 py-1 text-left">Dataset Date</th>
            </tr>
          </thead>
          <tbody>
            {population.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.name}</td>
                <td className="border px-2 py-1">{r.pcode}</td>
                <td className="border px-2 py-1">{r.population}</td>
                <td className="border px-2 py-1">{r.year}</td>
                <td className="border px-2 py-1">{r.dataset_date}</td>
              </tr>
            ))}
            {population.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-6">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchPopulation}
      />
    </SidebarLayout>
  );
}
