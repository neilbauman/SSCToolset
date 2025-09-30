"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import EditMetadataModal from "@/components/country/EditMetadataModal";

export default async function CountryDetailPage({ params }: any) {
  const resolved = params?.then ? await params : params;
  const id = resolved?.id ?? "unknown";

  // Mock data (replace with Supabase later)
  const country = {
    id,
    name: "Philippines",
    iso: "PHL",
    population: 113900000,
    lastUpdated: "2024-01-01",
    admLabels: { adm1: "Province", adm2: "Municipality", adm3: "Barangay" },
    sources: { boundaries: "HDX COD 2024", population: "NSO Census 2020" },
  };

  const [openMeta, setOpenMeta] = useState(false);

  const headerProps = {
    title: country.name,
    group: "country-config" as const,
    description: "Baseline datasets and metadata for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country.name },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Metadata Section */}
      <div className="border rounded-lg p-4 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>
        <p>ADM1 = {country.admLabels.adm1}</p>
        <p>ADM2 = {country.admLabels.adm2}</p>
        <p>ADM3 = {country.admLabels.adm3}</p>
        <p>Boundaries Source: {country.sources.boundaries}</p>
        <p>Population Source: {country.sources.population}</p>

        <Button
          className="bg-gray-200 text-gray-800 hover:bg-gray-300 mt-4"
          onClick={() => setOpenMeta(true)}
        >
          Edit Metadata
        </Button>
      </div>

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        open={openMeta}
        onClose={() => setOpenMeta(false)}
        metadata={{
          adm1: country.admLabels.adm1,
          adm2: country.admLabels.adm2,
          adm3: country.admLabels.adm3,
          boundariesSource: country.sources.boundaries,
          populationSource: country.sources.population,
        }}
        onSave={(updated) => console.log("Updated metadata:", updated)}
      />

      {/* Admin Units Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Administrative Units</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">PCode</th>
                <th className="px-4 py-2">Level</th>
                <th className="px-4 py-2">Population</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Metro Manila</td>
                <td className="px-4 py-2">PH001</td>
                <td className="px-4 py-2">ADM1</td>
                <td className="px-4 py-2">13,484,462</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Quezon City</td>
                <td className="px-4 py-2">PH001001</td>
                <td className="px-4 py-2">ADM2</td>
                <td className="px-4 py-2">2,960,048</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Barangay Bagong Pag-asa</td>
                <td className="px-4 py-2">PH001001001</td>
                <td className="px-4 py-2">ADM3</td>
                <td className="px-4 py-2 italic text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
