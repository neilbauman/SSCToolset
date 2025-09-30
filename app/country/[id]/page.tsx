"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import EditMetadataModal from "@/components/country/EditMetadataModal";

export default async function CountryDetailPage({ params }: any) {
  // Handle both object or promise (Next.js 15 typing quirk)
  const resolved = params?.then ? await params : params;
  const id = resolved?.id ?? "unknown";

  // Mock country data (replace with Supabase query later)
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

  const handleSaveMetadata = (updated: any) => {
    console.log("Updated metadata:", updated);
  };

  return (
    <SidebarLayout
      headerProps={{
        title: country.name,
        group: "Country Configuration",
        description: "Baseline datasets and metadata for this country.",
        breadcrumbs: [
          { name: "Dashboard", href: "/" },
          { name: "Country Configuration", href: "/country" },
          { name: country.name, href: `/country/${country.id}` },
        ],
      }}
    >
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
        onSave={handleSaveMetadata}
      />
    </SidebarLayout>
  );
}
