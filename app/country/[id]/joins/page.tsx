"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

type JoinRow = {
  id: string;
  country_iso: string;
  datasets?: any;
  advanced?: boolean;
  admin_datasets?: any[];
  population_datasets?: any[];
  gis_datasets?: any[];
  notes?: string;
  created_at?: string;
  is_active?: boolean;
};

export default function ManageJoinsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const [joins, setJoins] = useState<JoinRow[]>([]);
  const [country, setCountry] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: countryData } = await supabase
        .from("countries")
        .select("name")
        .eq("iso_code", countryIso)
        .single();
      setCountry(countryData);

      const { data } = await supabase
        .from("dataset_joins")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (data) setJoins(data as JoinRow[]);
    };
    fetchData();
  }, [countryIso]);

  const setActive = async (joinId: string) => {
    // Clear current active
    await supabase
      .from("dataset_joins")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    // Set chosen active
    await supabase
      .from("dataset_joins")
      .update({ is_active: true })
      .eq("id", joinId);

    // Refresh
    const { data } = await supabase
      .from("dataset_joins")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (data) setJoins(data as JoinRow[]);
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Manage Joins`,
    group: "country-config" as const,
    description: "View and manage dataset joins for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Joins" },
        ]}
      />
    ),
  };

  const renderDatasets = (join: JoinRow) => {
    if (join.datasets) {
      return (
        <ul className="list-disc pl-5 text-sm text-gray-700">
          {join.datasets.map((d: any, idx: number) => (
            <li key={idx}>
              <span className="font-medium capitalize">{d.type}</span>:{" "}
              {d.title ?? d.dataset_id ?? "—"}{" "}
              {d.year ? `(${d.year})` : ""} [join: {d.join_key}]
            </li>
          ))}
        </ul>
      );
    }

    // Fallback to old fields
    return (
      <ul className="list-disc pl-5 text-sm text-gray-700">
        {join.admin_datasets?.[0] && (
          <li>Admin: {join.admin_datasets[0].title} ({join.admin_datasets[0].year})</li>
        )}
        {join.population_datasets?.[0] && (
          <li>Population: {join.population_datasets[0].title} ({join.population_datasets[0].year})</li>
        )}
        {join.gis_datasets?.[0] && (
          <li>GIS: {join.gis_datasets[0].title} ({join.gis_datasets[0].year})</li>
        )}
      </ul>
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Dataset Joins</h2>

        {joins.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-left">Datasets</th>
                <th className="border px-2 py-1 text-left">Notes</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {joins.map((join) => (
                <tr key={join.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">
                    {join.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1">{renderDatasets(join)}</td>
                  <td className="border px-2 py-1">{join.notes ?? "—"}</td>
                  <td className="border px-2 py-1 text-gray-500">
                    {join.created_at
                      ? new Date(join.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="border px-2 py-1">
                    {!join.is_active && (
                      <button
                        onClick={() => setActive(join.id)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
                      >
                        Set Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No joins defined yet.</p>
        )}
      </div>
    </SidebarLayout>
  );
}
