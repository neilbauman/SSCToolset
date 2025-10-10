"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddNationalStatModal from "@/app/country/components/AddNationalStatModal";

export default function OtherDatasetsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);

  // Fetch all dataset_metadata for this country
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });
      if (error) console.error("Fetch failed:", error);
      else setDatasets(data || []);
    };
    fetchDatasets();
  }, [id, openAdd]);

  const headerProps = {
    title: "Other Datasets & National Statistics",
    group: "country-datasets" as const,
    description: "Upload and manage country-specific datasets and statistics.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id.toUpperCase(), href: `/country/${id}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">National Statistics</h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
        >
          ➕ Add Statistic
        </button>
      </div>

      {datasets.length === 0 ? (
        <p className="text-gray-500 italic">No datasets uploaded yet.</p>
      ) : (
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Theme</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Source</th>
              <th className="border p-2 text-right">Value</th>
              <th className="border p-2 text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.id}>
                <td className="border p-2">{d.title}</td>
                <td className="border p-2">{d.theme || "—"}</td>
                <td className="border p-2">{d.upload_type || "national_statistic"}</td>
                <td className="border p-2">{d.source || "—"}</td>
                <td className="border p-2 text-right">{d.value ?? "—"}</td>
                <td className="border p-2 text-right">{d.unit ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openAdd && (
        <AddNationalStatModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={id}
          onSaved={() => setOpenAdd(false)}
        />
      )}
    </SidebarLayout>
  );
}
