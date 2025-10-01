"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import { Map } from "lucide-react";

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

  const filteredUnits = adminUnits.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.pcode.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedUnits = filteredUnits.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleSaveSource = async (newSource: { name: string; url?: string }) => {
    await supabase
      .from("admin_units")
      .update({ source: newSource })
      .eq("country_iso", countryIso);

    // Update locally
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
      {/* Summary */}
      <div className="border rounded-lg p-4 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Map className="w-5 h-5 text-green-600" /> Admin Units Summary
        </h2>
        {country && (
          <p className="text-sm text-gray-700 mb-2">
            Levels:{" "}
            {[
              country.adm0_label,
              country.adm1_label,
              country.adm2_label,
              country.adm3_label,
              country.adm4_label,
              country.adm5_label,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        <p className="text-sm mb-2">
          Total Units:{" "}
          <span className="font-semibold">{adminUnits.length}</span>
        </p>
        <p className="text-sm">
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
          className="mt-2 px-3 py-1.5 rounded-md text-sm bg-gray-200 hover:bg-gray-300"
        >
          Edit Source
        </button>
      </div>

      {/* Search + Table */}
      <div className="mb-3 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by name or PCode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm w-1/3"
        />
      </div>
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
