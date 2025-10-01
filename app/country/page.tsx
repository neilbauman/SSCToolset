"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddCountryModal from "@/components/country/AddCountryModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Globe, Calendar, Pencil, Trash2 } from "lucide-react";

function SoftButton({
  children,
  color = "gray",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "blue" | "red";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "px-3 py-1.5 text-sm rounded-md font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    green: "bg-[color:var(--gsc-green)] text-white hover:opacity-90",
    blue: "bg-[color:var(--gsc-blue)] text-white hover:opacity-90",
    red: "bg-[color:var(--gsc-red)] text-white hover:opacity-90",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${colors[color]}`}
    >
      {children}
    </button>
  );
}

type Country = {
  iso_code: string;
  name: string;
  updated_at?: string | null;
};

export default function CountryPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editCountry, setEditCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCountries = async () => {
    const { data } = await supabase
      .from("countries")
      .select("iso_code, name, updated_at")
      .order("name", { ascending: true });
    if (data) setCountries(data as Country[]);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleDelete = async (c: Country) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${c.name}" (${c.iso_code})? This cannot be undone.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await supabase.from("countries").delete().eq("iso_code", c.iso_code);
      await fetchCountries();
    } finally {
      setLoading(false);
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm flex items-center gap-3">
          <Globe className="w-6 h-6 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Countries</p>
            <p className="text-lg font-semibold">{countries.length}</p>
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
      <div className="flex justify-end items-center mb-4">
        <SoftButton color="green" onClick={() => setOpenAdd(true)}>
          + Add Country
        </SoftButton>
      </div>

      {/* Country table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-sm font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2 w-[40%] text-left">Name</th>
              <th className="px-4 py-2 w-[20%] text-left">ISO Code</th>
              <th className="px-4 py-2 w-[20%] text-left">Last Updated</th>
              <th className="px-4 py-2 w-[20%] text-left">Actions</th>
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
                  {c.updated_at
                    ? new Date(c.updated_at).toISOString().split("T")[0]
                    : "—"}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <SoftButton
                    color="gray"
                    onClick={() => {
                      setEditCountry(c);
                      setOpenAdd(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </SoftButton>
                  <SoftButton
                    color="red"
                    onClick={() => handleDelete(c)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </SoftButton>
                </td>
              </tr>
            ))}
            {countries.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-6 text-gray-500 italic"
                >
                  No countries configured yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AddCountryModal
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
          setEditCountry(null);
        }}
        onSave={() => fetchCountries()}
        mode={editCountry ? "edit" : "add"}
        initialCountry={editCountry}
      />
    </SidebarLayout>
  );
}
