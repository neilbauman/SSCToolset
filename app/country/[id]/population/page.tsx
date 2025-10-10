"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Users, Database, Upload, BarChart2 } from "lucide-react";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };

export default function CountryPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [openAdminUpload, setOpenAdminUpload] = useState(false);
  const [openPopUpload, setOpenPopUpload] = useState(false);
  const [openGISUpload, setOpenGISUpload] = useState(false);

  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCountry(data);
      });
  }, [id]);

  const headerProps = {
    title: `${country?.name ?? id} – Country Configuration`,
    group: "country-config" as const,
    description:
      "Upload and manage datasets, administrative boundaries, population, and GIS data for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? id, href: `/country/${id}` },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 🧱 Administrative Units */}
        <div className="border rounded-lg p-5 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Administrative Units</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload and manage versioned administrative boundary datasets.
            </p>
          </div>
          <div className="flex justify-between">
            <a
              href={`/country/${id}/admins`}
              className="text-blue-700 text-sm hover:underline"
            >
              Manage Datasets →
            </a>
            <button
              onClick={() => setOpenAdminUpload(true)}
              className="flex items-center gap-1 bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        {/* 👥 Population Data */}
        <div className="border rounded-lg p-5 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Population Data</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage population datasets linked to administrative boundaries.
            </p>
          </div>
          <div className="flex justify-between">
            <a
              href={`/country/${id}/population`}
              className="text-blue-700 text-sm hover:underline"
            >
              Manage Datasets →
            </a>
            <button
              onClick={() => setOpenPopUpload(true)}
              className="flex items-center gap-1 bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        {/* 🗺 GIS Layers */}
        <div className="border rounded-lg p-5 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">GIS Layers</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage uploaded GIS layers for analytical and visualization
              outputs.
            </p>
          </div>
          <div className="flex justify-between">
            <a
              href={`/country/${id}/gis`}
              className="text-blue-700 text-sm hover:underline"
            >
              Manage Datasets →
            </a>
            <button
              onClick={() => setOpenGISUpload(true)}
              className="flex items-center gap-1 bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* 📈 Indicators */}
      <div className="border rounded-lg p-5 shadow-sm bg-white mt-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Indicators & Analysis</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Analytical outputs generated from integrated datasets will appear here
          once population, administrative, and GIS layers are all configured.
        </p>
        <div className="text-sm italic text-gray-500">
          Coming soon: automatic data integrity checks and indicator
          calculations.
        </div>
      </div>

      {/* 🧱 Upload Modals */}
      {openAdminUpload && (
        <UploadAdminUnitsModal
          open={openAdminUpload}
          onClose={() => setOpenAdminUpload(false)}
          countryIso={id}
          onUploaded={async () => {
            window.location.reload(); // ✅ Type-safe async wrapper
          }}
        />
      )}

      {openPopUpload && (
        <UploadPopulationModal
          open={openPopUpload}
          onClose={() => setOpenPopUpload(false)}
          countryIso={id}
          onUploaded={async () => {
            window.location.reload(); // ✅ Type-safe async wrapper
          }}
        />
      )}

      {openGISUpload && (
        <UploadGISModal
          open={openGISUpload}
          onClose={() => setOpenGISUpload(false)}
          countryIso={id}
          onUploaded={async () => {
            window.location.reload(); // ✅ Type-safe async wrapper
          }}
        />
      )}
    </SidebarLayout>
  );
}
