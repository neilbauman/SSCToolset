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

  const [adminOptions, setAdminOptions] = useState<any[]>([]);
  const [popOptions, setPopOptions] = useState<any[]>([]);
  const [gisOptions, setGisOptions] = useState<any[]>([]);

  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [selectedPop, setSelectedPop] = useState<string>("");
  const [selectedGIS, setSelectedGIS] = useState<string>("");

  const fetchJoins = async () => {
    const { data, error } = await supabase
      .from("dataset_joins")
      .select(
        `
        id,
        notes,
        created_at,
        is_active,
        admin_datasets ( id, title, year ),
        population_datasets ( id, title, year ),
        gis_datasets ( id, title, year )
      `
      )
      .eq("country_iso", id)
      .order("created_at", { ascending: false });

    if (!error) setJoins(data || []);
  };

  useEffect(() => {
    fetchJoins();

    const fetchOptions = async () => {
      const { data: admins } = await supabase
        .from("admin_datasets")
        .select("id, title, year")
        .eq("country_iso", id);
      const { data: pops } = await supabase
        .from("population_datasets")
        .select("id, title, year")
        .eq("country_iso", id);
      const { data: gis } = await supabase
        .from("gis_datasets")
        .select("id, title, year")
        .eq("country_iso", id);

      setAdminOptions(admins || []);
      setPopOptions(pops || []);
      setGisOptions(gis || []);
    };

    fetchOptions();
  }, [id]);

  const handleSave = async () => {
    const { error } = await supabase.from("dataset_joins").insert({
      country_iso: id,
      admin_dataset_id: selectedAdmin || null,
      population_dataset_id: selectedPop || null,
      gis_dataset_id: selectedGIS || null,
      notes: "Created manually",
    });

    if (!error) {
      setOpenModal(false);
      setSelectedAdmin("");
      setSelectedPop("");
      setSelectedGIS("");
      fetchJoins();
    } else {
      console.error("Error creating join:", error);
    }
  };

  const handleSetActive = async (joinId: string) => {
    // deactivate others
    await supabase
      .from("dataset_joins")
      .update({ is_active: false })
      .eq("country_iso", id);

    // activate selected
    await supabase
      .from("dataset_joins")
      .update({ is_active: true })
      .eq("id", joinId);

    fetchJoins();
  };

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
                <th className="border px-2 py-1 text-left">Active</th>
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
                  <td className="border px-2 py-1">
                    {j.is_active ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetActive(j.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:opacity-90"
                      >
                        Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for creating a new join */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Join</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Admin Dataset</label>
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">— None —</option>
                  {adminOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title} ({opt.year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Population Dataset</label>
                <select
                  value={selectedPop}
                  onChange={(e) => setSelectedPop(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">— None —</option>
                  {popOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title} ({opt.year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">GIS Dataset</label>
                <select
                  value={selectedGIS}
                  onChange={(e) => setSelectedGIS(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">— None —</option>
                  {gisOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title} ({opt.year})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setOpenModal(false)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
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
