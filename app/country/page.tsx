"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddCountryModal from "@/components/country/AddCountryModal";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Pencil, Trash2, Globe } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Country = {
  iso_code: string;
  name: string;
  last_updated?: string;
};

export default function CountryPage() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editCountry, setEditCountry] = useState<Country | null>(null);
  const [deleteCountry, setDeleteCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCountries = async () => {
    const { data } = await supabase
      .from("countries")
      .select("iso_code, name, updated_at");
    if (data) {
      setCountries(
        data.map((c) => ({
          iso_code: c.iso_code,
          name: c.name,
          last_updated: c.updated_at,
        }))
      );
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleDelete = async (country: Country) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("countries")
        .delete()
        .eq("iso_code", country.iso_code);
      if (error) throw error;
      await fetchCountries();
    } catch (err) {
      console.error("Error deleting country:", err);
    } finally {
      setLoading(false);
      setDeleteCountry(null);
    }
  };

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Globe className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Total Countries</p>
            <p className="text-lg font-semibold">{countries.length}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Pencil className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold">
              {countries.length > 0
                ? new Date(
                    countries
                      .map((c) => c.last_updated || "")
                      .filter(Boolean)
                      .sort()
                      .reverse()[0]
                  ).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-[color:var(--gsc-red)]" />
          <div>
            <p className="text-sm text-gray-500">Deletions Pending</p>
            <p className="text-lg font-semibold">
              {deleteCountry ? 1 : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[40%]">Name</th>
              <th className="px-4 py-2 w-[20%]">ISO Code</th>
              <th className="px-4 py-2 w-[25%]">Last Updated</th>
              <th className="px-4 py-2 w-[15%] text-right">Actions</th>
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
                  {c.last_updated
                    ? new Date(c.last_updated).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <button
                    className="p-1.5 rounded hover:bg-gray-100"
                    onClick={() => {
                      setEditCountry(c);
                      setOpenAdd(true);
                    }}
                    title="Edit Country"
                  >
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-red-50"
                    onClick={() => setDeleteCountry(c)}
                    title="Delete Country"
                  >
                    <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                  </button>
                </td>
              </tr>
            ))}
            {countries.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  No countries configured yet.
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
        onSave={async () => {
          await fetchCountries();
        }}
        mode={editCountry ? "edit" : "add"}
        initialCountry={editCountry}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationModal
        open={!!deleteCountry}
        title="Confirm Delete"
        message={
          deleteCountry
            ? `Are you sure you want to delete "${deleteCountry.name}" (${deleteCountry.iso_code})?`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={() => {
          if (deleteCountry) handleDelete(deleteCountry);
        }}
        onCancel={() => setDeleteCountry(null)}
      />
    </SidebarLayout>
  );
}
