"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export default function CountryDetailPage({ params }: { params: { id: string } }) {
  // Mock country record
  const country = {
    id: params.id,
    name: "Philippines",
    iso: "PHL",
    population: 113900000,
    lastUpdated: "2024-01-01",
    admLabels: { adm1: "Province", adm2: "Municipality", adm3: "Barangay" },
    sources: { boundaries: "HDX COD 2024", population: "NSO Census 2020" },
  };

  return (
    <SidebarLayout>
      <PageHeader
        title={country.name}
        group="Country Configuration"
        description="Baseline datasets and metadata for this country."
        breadcrumbs={[
          { name: "Dashboard", href: "/" },
          { name: "Country Configuration", href: "/country" },
          { name: country.name, href: `/country/${country.id}` },
        ]}
      />

      {/* Metadata Section */}
      <div className="border rounded-lg p-4 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">ISO Code</p>
            <p>{country.iso}</p>
          </div>
          <div>
            <p className="font-medium">Population</p>
            <p>{country.population.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium">Admin Levels</p>
            <p>{`ADM1 = ${country.admLabels.adm1}, ADM2 = ${country.admLabels.adm2}, ADM3 = ${country.admLabels.adm3}`}</p>
          </div>
          <div>
            <p className="font-medium">Sources</p>
            <p>Boundaries: {country.sources.boundaries}</p>
            <p>Population: {country.sources.population}</p>
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">Edit Metadata</Button>
        </div>
      </div>

      {/* Admin Units Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Administrative Units</h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">PCode</th>
              <th className="px-4 py-2 text-left">Level</th>
              <th className="px-4 py-2 text-left">Population</th>
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
    </SidebarLayout>
  );
}
