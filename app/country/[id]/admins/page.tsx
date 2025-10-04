"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import { Database, Pencil, Upload, Download } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label: string;
  adm1_label: string;
  adm2_label: string;
  adm3_label: string;
  adm4_label: string;
  adm5_label: string;
};

type AdminUnit = {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string | null;
};

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openSource, setOpenSource] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "tree">("table");
  const pageSize = 25;

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch admin units
  const fetchAdminUnits = async () => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching admin_units:", error);
      return;
    }

    if (data) {
      setAdminUnits(data as AdminUnit[]);
      const grouped: Record<string, number> = {};
      (data as AdminUnit[]).forEach((u) => {
        grouped[u.level] = (grouped[u.level] || 0) + 1;
      });
      setCounts(grouped);
    }
  };

  useEffect(() => {
    fetchAdminUnits();
  }, [countryIso]);

  // Health checks
  const missingPcodes = adminUnits.filter((u) => !u.pcode).length;
  const allHavePcodes = adminUnits.length > 0 && missingPcodes === 0;

  // Pagination + search
  const filtered = adminUnits.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  // Generate CSV template
  const handleDownloadTemplate = () => {
    const csv = "pcode,name,level,parent_pcode\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin_units_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary */}
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
          <ul className="text-sm text-gray-700 mb-2">
            {Object.entries(counts).map(([lvl, cnt]) => {
              const label =
                (lvl === "ADM0" && country?.adm0_label) ||
                (lvl === "ADM1" && country?.adm1_label) ||
                (lvl === "ADM2" && country?.adm2_label) ||
                (lvl === "ADM3" && country?.adm3_label) ||
                (lvl === "ADM4" && country?.adm4_label) ||
                (lvl === "ADM5" && country?.adm5_label) ||
                lvl;
              return (
                <li key={lvl}>
                  <strong>
                    {lvl} ({label}):
                  </strong>{" "}
                  {cnt}
                </li>
              );
            })}
            {Object.keys(counts).length === 0 && (
              <li className="italic text-gray-400">No levels found</li>
            )}
          </ul>

          <div className="flex justify-between mt-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-1" /> Download Template
            </button>
          </div>
        </div>

        {/* Data Health */}
        <DatasetHealth
          totalUnits={adminUnits.length}
          allHavePcodes={allHavePcodes}
          missingPcodes={missingPcodes}
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "table"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("table")}
        >
          Table View
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "tree"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("tree")}
        >
          Tree View
        </button>
      </div>

      {view === "table" && (
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
              {paginated.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{u.name}</td>
                  <td className="border px-2 py-1">{u.pcode}</td>
                  <td className="border px-2 py-1">{u.level}</td>
                  <td className="border px-2 py-1">{u.parent_pcode ?? "-"}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-gray-500 py-6"
                  >
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "tree" && <AdminUnitsTree units={adminUnits} />}

      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchAdminUnits}
      />
    </SidebarLayout>
  );
}
