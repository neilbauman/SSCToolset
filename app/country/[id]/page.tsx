"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import EditMetadataModal from "@/components/country/EditMetadataModal";
import CountryMetadataCard from "@/components/country/CountryMetadataCard";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import CountryHealthSummary from "@/components/country/CountryHealthSummary";
import CountryDatasetSummary from "@/components/country/CountryDatasetSummary";

import type { CountryParams } from "@/app/country/types";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

async function reloadPage() {
  if (typeof window !== "undefined") window.location.reload();
}

// Small internal component to preview recent derived datasets
function DerivedDatasetsPreview({ countryIso }: { countryIso: string }) {
  const [rows, setRows] = useState<
    { derived_dataset_id: string; derived_title: string; year: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("view_derived_dataset_summary")
        .select("derived_dataset_id, derived_title, year")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) setRows(data);
      setLoading(false);
    }
    load();
  }, [countryIso]);

  if (loading)
    return (
      <p className="text-sm text-gray-500">Loading derived datasets…</p>
    );

  if (rows.length === 0)
    return (
      <p className="text-sm text-gray-500">
        No derived datasets have been created yet.
      </p>
    );

  return (
    <ul className="divide-y divide-[var(--gsc-light-gray)] text-sm">
      {rows.map((r) => (
        <li key={r.derived_dataset_id} className="py-1.5 flex justify-between">
          <span>{r.derived_title}</span>
          <span className="text-gray-500">{r.year ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CountryConfigLandingPage({ params }: any) {
  const { id } = params as CountryParams;
  const [country, setCountry] = useState<any>(null);

  // Modals
  const [openMeta, setOpenMeta] = useState(false);
  const [openAdminUpload, setOpenAdminUpload] = useState(false);
  const [openPopUpload, setOpenPopUpload] = useState(false);
  const [openGISUpload, setOpenGISUpload] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", id)
        .single();
      if (!error && data) setCountry(data);
    };
    fetchCountry();
  }, [id]);

  const headerProps = {
    title: `${country?.name ?? id} – Country Configuration`,
    group: "country-config" as const,
    description: "Manage baseline datasets and metadata for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? id },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Health overview */}
      <CountryHealthSummary countryIso={id} />

      {/* Map + Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
          {typeof window !== "undefined" && (
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={5}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              zoomControl={false}
              dragging={true}
              style={{ height: "400px", width: "100%" }}
              className="rounded-md z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
              />
            </MapContainer>
          )}
        </div>
        <CountryMetadataCard
          country={country}
          onEdit={() => setOpenMeta(true)}
        />
      </div>

      {/* Country Dataset Summary */}
      <div className="mt-6">
        <CountryDatasetSummary countryIso={id} />
      </div>

      {/* Derived Datasets – mirror of Other Datasets section */}
      <div className="mt-6 border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-red)]">
            Derived Datasets
          </h2>
          <a
            href={`/country/${id}/derived`}
            className="text-sm font-medium text-[color:var(--gsc-red)] hover:underline"
          >
            View all →
          </a>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Analytical datasets produced by joining population, administrative, GIS,
          or other country datasets.
        </p>
        <DerivedDatasetsPreview countryIso={id} />
      </div>

      {/* Modals */}
      <UploadAdminUnitsModal
        open={openAdminUpload}
        onClose={() => setOpenAdminUpload(false)}
        countryIso={id}
        onUploaded={reloadPage}
      />
      <UploadPopulationModal
        open={openPopUpload}
        onClose={() => setOpenPopUpload(false)}
        countryIso={id}
        onUploaded={reloadPage}
      />
      {openGISUpload && (
        <UploadGISModal
  open={openGISUpload}
  countryIso={id}
  onClose={() => setOpenGISUpload(false)}
  onUploaded={reloadPage}
/>
      )}
      {country && (
        <EditMetadataModal
          open={openMeta}
          onClose={() => setOpenMeta(false)}
          metadata={{
            iso_code: country.iso_code,
            name: country.name,
            admLabels: {
              adm0: country.adm0_label,
              adm1: country.adm1_label,
              adm2: country.adm2_label,
              adm3: country.adm3_label,
              adm4: country.adm4_label,
              adm5: country.adm5_label,
            },
            datasetSources: country.dataset_sources || [],
            extra: country.extra_metadata || {},
          }}
          onSave={async (updated) => {
            await supabase.from("countries").upsert({
              iso_code: updated.iso_code,
              name: updated.name,
              adm0_label: updated.admLabels.adm0,
              adm1_label: updated.admLabels.adm1,
              adm2_label: updated.admLabels.adm2,
              adm3_label: updated.admLabels.adm3,
              adm4_label: updated.admLabels.adm4,
              adm5_label: updated.admLabels.adm5,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
            setCountry({
              ...country,
              ...updated,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
          }}
        />
      )}
    </SidebarLayout>
  );
}
