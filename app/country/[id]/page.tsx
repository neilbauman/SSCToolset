"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import EditMetadataModal from "@/components/country/EditMetadataModal";
import UploadAdminUnits from "@/components/country/UploadAdminUnits";
import { Pencil, Trash2 } from "lucide-react";

export default function CountryDetailPage({ params }: any) {
  const id = params?.id ?? "unknown"; // loosened typing

  // Mock data (replace with Supabase later)
  const country = {
    iso: id,
    name: id === "PHL" ? "Philippines" : id === "NPL" ? "Nepal" : "Honduras",
    population: id === "PHL" ? 113900000 : id === "NPL" ? 30000000 : null,
    lastUpdated: id === "PHL" ? "2024-01-01" : id === "NPL" ? "2023-08-10" : "2023-11-15",
    admLabels: { adm1: "Province", adm2: "Municipality", adm3: "Barangay" },
    sources: { boundaries: "HDX COD 2024", population: "NSO Census 2020" },
  };

  const [openMeta, setOpenMeta] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  // Mock admin units (will later come from Supabase)
  const adminUnits = [
    { id: "PH001", name: "Metro Manila", level: "ADM1", population: 13484462 },
    { id: "PH001001", name: "Quezon City", level: "ADM2", population: 2960048 },
    { id: "PH001001001", name: "Barangay Bagong Pag-asa", level: "ADM3", population: null },
  ];

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
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Administrative Units</h2>
          <Button
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Exit Edit Mode" : "Edit Mode"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">PCode</th>
                <th className="px-4 py-2">Level</th>
                <th className="px-4 py-2">Population</th>
                {editMode && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {adminUnits.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2">{u.level}</td>
                  <td className="px-4 py-2">
                    {u.population ? (
                      u.population.toLocaleString()
                    ) : (
                      <span className="italic text-gray-400">—</span>
                    )}
                  </td>
                  {editMode && (
                    <td className="px-4 py-2 flex gap-2">
                      <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button className="bg-red-600 text-white hover:bg-red-700 px-2 py-1">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload + Preview Admin Units */}
      <UploadAdminUnits countryIso={country.iso} />
    </SidebarLayout>
  );
}
