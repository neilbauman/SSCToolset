"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/Button";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddCountryModal from "@/components/country/AddCountryModal";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Pencil, Trash2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Country = {
  iso_code: string;
  name: string;
  last_updated?: string;
};

export default function CountryPage() {
  const [editMode, setEditMode] = useState(false);
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
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => setOpenAdd(true)}>+ Add Country</Button>
        <Button
          className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </Button>
      </div>

      {/* Countries Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[35%]">Name</th>
              <th className="px-4 py-2 w-[20%]">ISO Code</th>
              <th className="px-4 py-2 w-[25%]">Last Updated</th>
              <th className="px-4 py-2 w-[20%] text-right">Actions</th>
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
                <td className="px-4 py-2">{c.last_updated ?? "—"}</td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <Button
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1"
                    onClick={() => {
                      setEditCountry(c);
                      setOpenAdd(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700 px-2 py-1"
                    onClick={() => setDeleteCountry(c)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
            ? `Are you sure you want to delete "${deleteCountry.name}" (${deleteCountry.iso_code})? This cannot be undone.`
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
