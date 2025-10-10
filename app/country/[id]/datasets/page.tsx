"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { FileSpreadsheet, PlusCircle, Loader2, Trash2 } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type Dataset = {
  id: string;
  country_iso: string;
  indicator_id: string;
  title: string;
  description: string | null;
  source: string | null;
  admin_level: string | null;
  theme: string | null;
  upload_type: string | null;
  created_at: string;
  indicator?: { name: string; type: string; data_type: string };
};

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  // Fetch country
  useEffect(() => {
    const loadCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .maybeSingle();
      if (data) setCountry(data);
    };
    loadCountry();
  }, [countryIso]);

  // Fetch datasets
  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select(
        `*, indicator:indicator_catalogue(name,type,data_type)`
      )
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to fetch datasets:", error);
    setDatasets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    await supabase.from("dataset_metadata").delete().eq("id", id);
    await loadDatasets();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Other Datasets`,
    group: "country-config" as const,
    description: "Upload and manage additional datasets for this country, including statistics and gradients.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm bg-white mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Datasets
          </h2>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded text-sm hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Dataset
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="animate-spin w-4 h-4" /> Loading datasets...
          </div>
        ) : datasets.length > 0 ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Indicator</th>
                <th className="px-2 py-1 text-center">Type</th>
                <th className="px-2 py-1 text-center">Data Type</th>
                <th className="px-2 py-1 text-center">Admin Level</th>
                <th className="px-2 py-1 text-left">Source</th>
                <th className="px-2 py-1 text-center">Theme</th>
                <th className="px-2 py-1 text-center">Upload Type</th>
                <th className="px-2 py-1 text-center">Created</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1">{d.title || "Untitled"}</td>
                  <td className="px-2 py-1">{d.indicator?.name ?? "—"}</td>
                  <td className="px-2 py-1 text-center">{d.indicator?.type ?? "—"}</td>
                  <td className="px-2 py-1 text-center">{d.indicator?.data_type ?? "—"}</td>
                  <td className="px-2 py-1 text-center">{d.admin_level ?? "—"}</td>
                  <td className="px-2 py-1">{d.source ?? "—"}</td>
                  <td className="px-2 py-1 text-center">{d.theme ?? "—"}</td>
                  <td className="px-2 py-1 text-center capitalize">{d.upload_type ?? "—"}</td>
                  <td className="px-2 py-1 text-center">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">No datasets uploaded yet.</p>
        )}
      </div>

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onUploaded={loadDatasets}
        />
      )}
    </SidebarLayout>
  );
}
