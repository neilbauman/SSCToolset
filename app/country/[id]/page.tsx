"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map } from "lucide-react";
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
import ManageJoinsCard from "@/components/country/ManageJoinsCard";
import DerivedDatasetTable from "@/components/country/DerivedDatasetTable";
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

export default function CountryConfigLandingPage({ params }: any) {
  const { id } = params as CountryParams;
  const [country, setCountry] = useState<any>(null);
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
      {/* --- Country Data Health --- */}
      <CountryHealthSummary countryIso={id} />

      {/* --- Map + Metadata --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
        <div className="lg:col-span-2 border rounded-lg p-3 shadow-sm">
          <h2 className="text-base font-semibold mb-2 text-[#123865]">Map Overview</h2>
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

      {/* --- Country Dataset Summary --- */}
      <div className="mt-6">
        <CountryDatasetSummary countryIso={id} />
      </div>

      {/* --- Manage Joins --- */}
      <div className="mt-6">
        <ManageJoinsCard countryIso={id} />
      </div>

      {/* --- Derived Datasets --- */}
      <div className="mt-6">
        <h2 className="text-base font-semibold text-[#123865] mb-2">Derived Datasets</h2>
        <p className="text-gray-600 text-sm mb-2">
          These datasets represent analytical joins between multiple indicators. They serve as inputs for SSC Instances.
        </p>
        <DerivedDatasetTable countryIso={id} />
      </div>

      {/* --- Upload / Edit Modals --- */}
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
          datasetVersionId={""}
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
