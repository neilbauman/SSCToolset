"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Upload, FileDown } from "lucide-react";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
  dataset_version_id: string;
};

export default function AdminsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  const filtered = adminUnits.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  const handleDownloadTemplate = () => {
    const header = ["pcode,name,level,parent_pcode"];
    const example = [
      "PH0000000000,Philippines,ADM0,",
      "PH1300000000,National Capital Region,ADM1,PH0000000000",
      "PH133900000,Manila,ADM2,PH1300000000",
    ];
    const csvContent = [header.join("\n"), example.join("\n")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "admin_units_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <strong>Total Units:</strong> {adminUnits.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Data
            </button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <input
            type="text"
            placeholder="Search by name or PCode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border px-3 py-1 rounded w-1/3 text-sm"
          />
          <span className="text-sm text-gray-500">
            Showing {paginated.length} of {filtered.length}
          </span>
        </div>
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
            {paginated.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.name}</td>
                <td className="border px-2 py-1">{r.pcode}</td>
                <td className="border px-2 py-1">{r.level}</td>
                <td className="border px-2 py-1">{r.parent_pcode}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
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
