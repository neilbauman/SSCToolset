"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import { generatePopulationTemplate } from "@/lib/templates/populationTemplate";
import { Users, Database, ShieldCheck, Pencil } from "lucide-react";

type PopulationRow = {
  id: string;
  pcode: string;
  population: number;
  last_updated: string | null;
};

type Source = { name: string; url?: string };

export default function PopulationPage({ params }: any) {
  const countryIso = params.id;

  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openSource, setOpenSource] = useState(false);

  useEffect(() => {
    const fetchPop = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setPopulation(data as PopulationRow[]);
    };
    fetchPop();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as Source);
    };
    fetchSource();
  }, [countryIso]);

  const totalPop = population.reduce((sum, r) => sum + (r.population || 0), 0);

  const headerProps = {
    title: `Population – ${countryIso}`,
    group: "country-config" as const,
    description: "Manage census population and demographic indicators.",
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

  const handleDownloadTemplate = () => {
    const blob = generatePopulationTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `population_template_${countryIso}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <strong>Records:</strong> {population.length}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {source ? (
                source.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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

        {/* Health */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Data Health
          </h2>
          <ul className="text-sm list-disc pl-6">
            <li className={population.length > 0 ? "text-green-700" : "text-red-700"}>
              {population.length > 0 ? "Population data uploaded" : "No data uploaded"}
            </li>
            <li className="text-yellow-700">Projection not applied</li>
            <li className="text-yellow-700">Households data not provided</li>
          </ul>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Population Data</h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {population.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{row.pcode}</td>
                <td className="border px-2 py-1">{row.population?.toLocaleString()}</td>
                <td className="border px-2 py-1">{row.last_updated || "-"}</td>
              </tr>
            ))}
            {population.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-gray-500 py-6">
                  No population data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
          Download Template
        </button>
        <button onClick={() => setOpenUpload(true)} className="px-4 py-2 bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90">
          Upload Data
        </button>
      </div>

      {/* Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          const { data } = await supabase.from("population_data").select("*").eq("country_iso", countryIso);
          if (data) setPopulation(data as PopulationRow[]);
        }}
      />

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
