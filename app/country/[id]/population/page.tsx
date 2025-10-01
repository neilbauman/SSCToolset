"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import { Plus, Download } from "lucide-react";

interface PopulationRecord {
  id: string;
  pcode?: string;
  name: string;
  population: number;
  year?: number;
  source?: string;
}

export default function PopulationPage({ params }: any) {
  const countryIso = params.id;
  const [data, setData] = useState<PopulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  const fetchPopulation = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .order("year", { ascending: true });

    if (!error && data) {
      setData(data as PopulationRecord[]);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPopulation();
  }, [countryIso]);

  const headerProps = {
    title: "Population Data",
    group: "country-config" as const,
    description: "Population and demographic datasets for this country.",
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
    window.location.href = "/api/templates/population";
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Population Datasets</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Upload Data
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 italic">
          No population datasets uploaded yet. Use the{" "}
          <strong>Upload Data</strong> button above.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">PCode</th>
                <th className="px-3 py-2 border">Name</th>
                <th className="px-3 py-2 border">Population</th>
                <th className="px-3 py-2 border">Year</th>
                <th className="px-3 py-2 border">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{row.pcode || "—"}</td>
                  <td className="px-3 py-2 border">{row.name}</td>
                  <td className="px-3 py-2 border">
                    {row.population.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 border">{row.year || "—"}</td>
                  <td className="px-3 py-2 border">{row.source || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchPopulation}
      />
    </SidebarLayout>
  );
}
