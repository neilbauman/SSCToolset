"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ManageJoinsPage({ params }: any) {
  const { id } = params as CountryParams;

  const [joins, setJoins] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const fetchJoins = async () => {
      const { data, error } = await supabase
        .from("dataset_joins")
        .select(
          `
          id,
          notes,
          created_at,
          admin_datasets ( title, year ),
          population_datasets ( title, year ),
          gis_datasets ( title, year )
        `
        )
        .eq("country_iso", id);

      if (error) {
        console.error("Error fetching joins:", error);
      } else {
        setJoins(data || []);
      }
    };

    fetchJoins();
  }, [id]);

  const headerProps = {
    title: `Manage Dataset Joins – ${id}`,
    group: "country-config" as const,
    description: "Link Admin, Population, and GIS datasets for consistent analysis.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Manage Joins" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Dataset Joins</h2>
          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Create New Join
          </button>
        </div>

        {joins.length === 0 ? (
          <p className="italic text-gray-500">No joins defined yet.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Admin</th>
                <th className="border px-2 py-1 text-left">Population</th>
                <th className="border px-2 py-1 text-left">GIS</th>
                <th className="border px-2 py-1 text-left">Notes</th>
                <th className="border px-2 py-1 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {joins.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">
                    {j.admin_datasets?.[0]?.title ? (
                      <Link
                        href={`/country/${id}/admins`}
                        className="text-blue-600 hover:underline"
                      >
                        {j.admin_datasets[0].title} ({j.admin_datasets[0].year})
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {j.population_datasets?.[0]?.title ? (
                      <Link
                        href={`/country/${id}/population`}
                        className="text-blue-600 hover:underline"
                      >
                        {j.population_datasets[0].title} ({j.population_datasets[0].year})
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {j.gis_datasets?.[0]?.title ? (
                      <Link
                        href={`/country/${id}/gis`}
                        className="text-blue-600 hover:underline"
                      >
                        {j.gis_datasets[0].title} ({j.gis_datasets[0].year})
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1">{j.notes || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(j.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal (placeholder for now) */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Join</h3>
            <p className="text-sm text-gray-600 mb-4">
              Here you will be able to select which Admin, Population, and GIS datasets to join.
              For now this is a placeholder modal.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setOpenModal(false)}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
