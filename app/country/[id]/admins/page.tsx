"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import HealthCard from "@/components/common/HealthCard";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import { Database, Pencil } from "lucide-react";

interface PageProps {
  params: { id: string };
}

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

type AdminUnit = {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string | null;
};

export default function AdminUnitsPage({ params }: PageProps) {
  const countryIso = params.id;

  const [country, setCountry] = useState<Country | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);
  const [view, setView] = useState<"table" | "tree">("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    supabase
      .from("countries")
      .select("*")
      .eq("iso", countryIso)
      .single()
      .then(({ data }) => data && setCountry(data as Country));

    supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", countryIso)
      .then(({ data }) => {
        if (data) {
          setAdminUnits(data as AdminUnit[]);
          const grouped: Record<string, number> = {};
          (data as AdminUnit[]).forEach((u) => {
            grouped[u.level] = (grouped[u.level] || 0) + 1;
          });
          setCounts(grouped);
        }
      });

    supabase
      .from("admin_units")
      .select("source")
      .eq("country_iso", countryIso)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data?.source && setSource(data.source as any));
  }, [countryIso]);

  // Health checks
  const missingPcodes = adminUnits.filter((u) => !u.pcode).length;
  const allHavePcodes = adminUnits.length > 0 && missingPcodes === 0;
  const hasGISLink = false;

  const statusChecks = [
    {
      label: allHavePcodes
        ? "All units have PCodes"
        : `${missingPcodes} units missing PCodes`,
      status: allHavePcodes ? "ok" : "error",
    },
    { label: "Population linkage not applied yet", status: "warning" },
    {
      label: hasGISLink ? "Aligned with GIS boundaries" : "GIS linkage not validated yet",
      status: hasGISLink ? "ok" : "error",
    },
  ];

  // Pagination
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health */}
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
          <p className="text-sm mb-2">
            <strong>Total Units:</strong> {adminUnits.length}
          </p>
          <ul className="text-sm mb-2">
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
          </ul>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {source ? (
                source.url ? (
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
        <HealthCard title="Data Health" checks={statusChecks} />
      </div>

      {/* Toggle + View */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "table" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("table")}
        >
          Table View
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "tree" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("tree")}
        >
          Tree View
        </button>
      </div>

      {view === "table" && (
        <div className="border rounded-lg p-4 shadow-sm">
          <input
            type="text"
            placeholder="Search by name or PCode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border px-3 py-1 rounded w-1/3 text-sm mb-3"
          />
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
                  <td colSpan={4} className="text-center text-gray-500 py-6">
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "tree" && <AdminUnitsTree units={adminUnits} />}

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("admin_units")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
