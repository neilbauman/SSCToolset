"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Users, ShieldCheck, Upload, Pencil } from "lucide-react";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";

type Country = {
  iso: string;
  name: string;
  adm0_label: string;
  adm1_label: string;
  adm2_label: string;
  adm3_label: string;
  adm4_label: string;
  adm5_label: string;
};

type PopulationRow = {
  id: string;
  country_iso: string;
  admin_pcode: string;
  population: number | null;
  households?: number | null;
  dataset_date?: string | null; // YYYY-MM-DD
  source?: { name: string; url?: string } | null;
};

export default function PopulationPage({ params }: any) {
  const countryIso = params?.id as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openSource, setOpenSource] = useState(false);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);

  useEffect(() => {
    const loadCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso", countryIso).single();
      if (data) setCountry(data as Country);
    };
    loadCountry();
  }, [countryIso]);

  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase.from("population_data").select("*").eq("country_iso", countryIso);
      if (error) {
        // Table may not exist yet; keep empty
        setRows([]);
        return;
      }
      setRows((data || []) as PopulationRow[]);
      if (data && data.length > 0 && data[0].source) setSource(data[0].source as any);
    };
    loadData();
  }, [countryIso]);

  // Summary stats
  const totalRows = rows.length;
  const totalPop = rows.reduce((sum, r) => sum + (r.population || 0), 0);
  const datasetDate = rows.find((r) => r.dataset_date)?.dataset_date || null;

  // Health
  const linkedToAdmins = rows.every((r) => !!r.admin_pcode);
  const hasSource = !!source;
  const statusBadge = totalRows > 0 && linkedToAdmins ? "uploaded" : totalRows > 0 ? "partial" : "missing";

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population / Demographics`,
    group: "country-config" as const,
    description: "Upload and inspect population datasets per admin unit.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health Row */}
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

          <p className="text-sm text-gray-700">
            <strong>Total Rows:</strong> {totalRows}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Total Population:</strong> {totalPop.toLocaleString()}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Dataset Date:</strong>{" "}
            {datasetDate ? datasetDate : <span className="italic text-gray-500">Empty</span>}
          </p>

          <div className="flex items-center justify-between mt-3">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {hasSource ? (
                source?.url ? (
                  <a href={source?.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source?.name}
                  </a>
                ) : (
                  source?.name
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

        {/* Data Health */}
        <div className="border rounded-lg p-4 shadow-sm relative">
          <div className="absolute top-2 right-2">
            {statusBadge === "uploaded" ? (
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">uploaded</span>
            ) : statusBadge === "partial" ? (
              <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">partial</span>
            ) : (
              <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">missing</span>
            )}
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
          </h2>
          <ul className="text-sm list-disc pl-6">
            <li className={linkedToAdmins ? "text-green-700" : "text-red-700"}>
              {linkedToAdmins ? "All rows linked to admin PCodes" : "Some rows missing admin PCodes"}
            </li>
            <li className={hasSource ? "text-green-700" : "text-red-700"}>
              {hasSource ? "Source provided" : "Source not set"}
            </li>
            <li className="text-yellow-700">Projection to current year not applied yet</li>
            <li className="text-yellow-700">Households / HH size not defined yet</li>
            <li className="text-yellow-700">Age/Sex disaggregation not provided</li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOpenUpload(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
        >
          <Upload className="w-4 h-4" />
          Upload Population CSV
        </button>
      </div>

      {/* Simple Data View (flat table for now) */}
      <div className="border rounded-lg p-4 shadow-sm">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Admin PCode</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Households</th>
              <th className="border px-2 py-1 text-left">Dataset Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.admin_pcode}</td>
                <td className="border px-2 py-1">{r.population?.toLocaleString() ?? "-"}</td>
                <td className="border px-2 py-1">{r.households?.toLocaleString() ?? "-"}</td>
                <td className="border px-2 py-1">{r.dataset_date ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No rows uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          const { data } = await supabase.from("population_data").select("*").eq("country_iso", countryIso);
          setRows((data || []) as PopulationRow[]);
        }}
      />

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          // store source on all rows for now (simple approach)
          await supabase.from("population_data").update({ source: newSource }).eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
