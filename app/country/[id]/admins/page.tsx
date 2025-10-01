"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import {
  Map,
  ShieldCheck,
  AlertTriangle,
  Filter,
  Search,
} from "lucide-react";

interface AdminUnit {
  id: string;
  name: string;
  pcode: string;
  level: string;
  source?: { name: string; url?: string };
}

export default function AdminUnitsPage({ params }: any) {
  const countryIso = params?.id as string;
  const [country, setCountry] = useState<any>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [openSource, setOpenSource] = useState(false);

  const rowsPerPage = 25;

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setAdminUnits(data as AdminUnit[]);
    };
    fetchUnits();
  }, [countryIso]);

  // Count per level
  const levelCounts: Record<string, number> = {};
  adminUnits.forEach((u) => {
    levelCounts[u.level] = (levelCounts[u.level] || 0) + 1;
  });

  // Health checks
  const missingPcodes = adminUnits.filter((u) => !u.pcode || u.pcode.trim() === "")
    .length;
  const allHavePcodes = missingPcodes === 0;

  // Filters
  const filteredUnits = adminUnits.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.pcode.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === "all" || u.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const paginatedUnits = filteredUnits.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleSaveSource = async (newSource: { name: string; url?: string }) => {
    await supabase
      .from("admin_units")
      .update({ source: newSource })
      .eq("country_iso", countryIso);

    setAdminUnits((prev) =>
      prev.map((u) => ({
        ...u,
        source: newSource,
      }))
    );
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage administrative boundaries and place codes.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  const source =
    adminUnits.length > 0 && adminUnits[0].source ? adminUnits[0].source : null;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Summary */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Map className="w-5 h-5 text-green-600" /> Admin Units Summary
          </h2>

          {country && (
            <>
              <p className="text-sm mb-2">
                Total Units:{" "}
                <span className="font-semibold">{adminUnits.length}</span>
              </p>
              <div className="text-sm mb-2">
                {Object.entries(levelCounts).map(([lvl, count]) => {
                  const label =
                    (lvl === "ADM0" && country.adm0_label) ||
                    (lvl === "ADM1" && country.adm1_label) ||
                    (lvl === "ADM2" && country.adm2_label) ||
                    (lvl === "ADM3" && country.adm3_label) ||
                    (lvl === "ADM4" && country.adm4_label) ||
                    (lvl === "ADM5" && country.adm5_label) ||
                    lvl;
                  return (
                    <p key={lvl}>
                      {lvl} ({label}):{" "}
                      <span className="font-semibold">{count}</span>
                    </p>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-sm">
            <p>
              Dataset Source:{" "}
              {source ? (
                <span>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.name}
                    </a>
                  ) : (
                    source.name
                  )}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                  Empty
                </span>
              )}
            </p>
            <button
              onClick={() => setOpenSource(true)}
              className="px-2 py-1 rounded-md text-xs bg-gray-200 hover:bg-gray-300"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Data Health */}
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
            </h2>
            {allHavePcodes ? (
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                Healthy
              </span>
            ) : adminUnits.length > 0 ? (
              <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
                Partial
              </span>
            ) : (
              <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                Needs Attention
              </span>
            )}
          </div>
          <ul className="text-sm list-disc pl-6">
            <li className={allHavePcodes ? "text-green-700" : "text-red-700"}>
              {allHavePcodes
                ? "All units have PCodes"
                : `${missingPcodes} units missing PCodes`}
            </li>
            <li className="text-yellow-700">
              Population linkage not applied yet
            </li>
          </ul>
        </div>
      </div>

      {/* Controls for Data View */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or PCode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">All Levels</option>
            {Object.keys(levelCounts).map((lvl) => {
              const label =
                (lvl === "ADM0" && country?.adm0_label) ||
                (lvl === "ADM1" && country?.adm1_label) ||
                (lvl === "ADM2" && country?.adm2_label) ||
                (lvl === "ADM3" && country?.adm3_label) ||
                (lvl === "ADM4" && country?.adm4_label) ||
                (lvl === "ADM5" && country?.adm5_label) ||
                lvl;
              return (
                <option key={lvl} value={lvl}>
                  {lvl} ({label})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Data View */}
      <div className="border rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Name
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                PCode
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Level
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUnits.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.pcode}</td>
                <td className="px-3 py-2">{u.level}</td>
              </tr>
            ))}
            {paginatedUnits.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-2 text-center text-gray-500">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm py-1">
          Page {page} of {Math.ceil(filteredUnits.length / rowsPerPage) || 1}
        </span>
        <button
          onClick={() =>
            setPage((p) =>
              p < Math.ceil(filteredUnits.length / rowsPerPage) ? p + 1 : p
            )
          }
          disabled={page >= Math.ceil(filteredUnits.length / rowsPerPage)}
          className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Edit Dataset Source Modal */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        datasetName="Admin Units"
        currentSource={source}
        onSave={handleSaveSource}
      />
    </SidebarLayout>
  );
}
