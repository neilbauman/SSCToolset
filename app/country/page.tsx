"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddCountryModal from "@/components/country/AddCountryModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Users, Globe, Calendar, Pencil, Trash2 } from "lucide-react";

function SoftButton({
  children,
  color = "gray",
  onClick,
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "blue" | "red";
  onClick?: () => void;
}) {
  const base =
    "px-3 py-1.5 text-sm rounded-md font-medium shadow-sm transition-colors";
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    green: "bg-[color:var(--gsc-green)] text-white hover:opacity-90",
    blue: "bg-[color:var(--gsc-blue)] text-white hover:opacity-90",
    red: "bg-[color:var(--gsc-red)] text-white hover:opacity-90",
  };
  return (
    <button onClick={onClick} className={`${base} ${colors[color]}`}>
      {children}
    </button>
  );
}

type Country = {
  iso_code: string;
  name: string;
  population?: number | null;
  updated_at?: string | null;
};

export default function CountryPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name, population, updated_at");
      if (data) setCountries(data as Country[]);
    };
    fetchCountries();
  }, []);

  const totalPopulation = useMemo(() => {
    return countries.reduce((sum, c) => sum + (c.population ?? 0), 0);
  }, [countries]);

  const lastUpdated = useMemo(() => {
    if (countries.length === 0) return "N/A";
    const dates = countries
      .map((c) => c.updated_at)
      .filter(Boolean)
      .map((d) => new Date(d as string));
    if (dates.length === 0) return "N/A";
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    return latest.toISOString().split("T")[0];
  }, [countries]);

  const headerProps = {
    title: "Country Configuration",
    group: "country-config" as const,
    description: "Manage baseline country data for SSC analysis.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm flex items-center gap-3">
          <Globe className="w-6 h-6 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Countries</p>
            <p className="text-lg font-semibold">{countries.length}</p>
          </div>
        </div>
        <div className="border rounded-lg p-4 shadow-sm flex items-center gap-3">
          <Users className="w-6 h-6 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">Total Population</p>
            <p className="text-lg font-semibold">
              {totalPopulation > 0 ? totalPopulation.toLocaleString() : "—"}
            </p>
          </div>
        </div>
        <div className="border rounded-lg p-4 shadow-sm flex items-center gap-3">
          <Calendar className="w-6 h-6 text-purple-600" />
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-lg font-semibold">{lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <SoftButton color="green" onClick={() => setOpenAdd(true)}>
          + Add Country
        </SoftButton>
        <SoftButton color="gray" onClick={() => setEditMode(!editMode)}>
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </SoftButton>
      </div>

      {/* Country table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">ISO Code</th>
              <th className="px-4 py-2">Population</th>
              <th className="px-4 py-2">Last Updated</th>
              {editMode && <th className="px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.iso_code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/country/${c.iso_code}`}
                    className="text-blue-700 hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.iso_code}</td>
                <td className="px-4 py-2">
                  {c.population ? (
                    c.population.toLocaleString()
                  ) : (
                    <span className="italic text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {c.updated_at
                    ? new Date(c.updated_at).toISOString().split("T")[0]
                    : "—"}
                </td>
                {editMode && (
                  <td className="px-4 py-2 flex gap-2">
                    <SoftButton color="gray">
                      <Pencil className="w-4 h-4" />
                    </SoftButton>
                    <SoftButton color="red">
                      <Trash2 className="w-4 h-4" />
                    </SoftButton>
                  </td>
                )}
              </tr>
            ))}
            {countries.length === 0 && (
              <tr>
                <td
                  colSpan={editMode ? 5 : 4}
                  className="text-center py-6 text-gray-500 italic"
                >
                  No countries configured yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Country Modal */}
      <AddCountryModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={(country) => console.log("Saving:", country)}
      />
    </SidebarLayout>
  );
}
