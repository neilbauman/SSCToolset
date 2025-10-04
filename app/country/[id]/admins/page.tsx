"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type AdminUnit = {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode: string | null;
};

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  const fetchAdminUnits = async () => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching admin_units:", error);
      return;
    }
    if (data) setAdminUnits(data as AdminUnit[]);
  };

  useEffect(() => {
    fetchAdminUnits();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  const totalUnits = adminUnits.length;
  const validPcodeCount = adminUnits.filter((r) => !!r.pcode).length;

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            Admin Units Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Units:</strong> {totalUnits}
          </p>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload / Replace Dataset
          </button>
        </div>

        <DatasetHealth
          totalUnits={totalUnits}
          allHavePcodes={validPcodeCount === totalUnits}
          missingPcodes={totalUnits - validPcodeCount}
        />
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">Parent PCode</th>
            </tr>
          </thead>
          <tbody>
            {adminUnits.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.name}</td>
                <td className="border px-2 py-1">{r.pcode}</td>
                <td className="border px-2 py-1">{r.level}</td>
                <td className="border px-2 py-1">{r.parent_pcode}</td>
              </tr>
            ))}
            {adminUnits.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchAdminUnits}
      />
    </SidebarLayout>
  );
}
