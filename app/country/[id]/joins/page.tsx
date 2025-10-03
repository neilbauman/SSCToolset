"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

export default function ManageJoinsPage({ params }: any) {
  const { id } = params as CountryParams;

  const [joins, setJoins] = useState<any[]>([]);

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
      <div className="border rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Dataset Joins</h2>
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
                    {j.admin_datasets?.[0]?.title || "—"}
                  </td>
                  <td className="border px-2 py-1">
                    {j.population_datasets?.[0]?.title || "—"}
                  </td>
                  <td className="border px-2 py-1">
                    {j.gis_datasets?.[0]?.title || "—"}
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
    </SidebarLayout>
  );
}
