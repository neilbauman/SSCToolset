"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, PlusCircle, Loader2, ExternalLink } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import type { CountryParams } from "@/app/country/types";

type DatasetMeta = {
  id: string;
  title: string;
  description?: string | null;
  source?: string | null;
  theme?: string | null;
  indicator_id?: string | null;
  admin_level?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Country = {
  iso_code: string;
  name: string;
};

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);

  // Fetch country info
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .maybeSingle();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  // Load dataset metadata for this country
  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to fetch datasets:", error);
    setDatasets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Datasets`,
    group: "country-config" as const,
    description:
      "Manage national and subnational datasets, including uploaded indicator data.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Datasets" },
        ]}
      />
    ),
  };

  const parseSource = (src: string | null) => {
    if (!src) return null;
    try {
      const s = JSON.parse(src);
      if (s.url)
        return (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            {s.name || s.url}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      return <span>{s.name || src}</span>;
    } catch {
      return <span>{src}</span>;
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Country Datasets
          </h2>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Dataset
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-600 text-sm">
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Loading datasets...
          </div>
        ) : datasets.length > 0 ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Theme</th>
                <th className="px-2 py-1 text-left">Admin Level</th>
                <th className="px-2 py-1 text-left">Source</th>
                <th className="px-2 py-1 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr
                  key={ds.id}
                  className="hover:bg-gray-50 border-t border-gray-200"
                >
                  <td className="px-2 py-1">{ds.title}</td>
                  <td className="px-2 py-1">{ds.theme || "—"}</td>
                  <td className="px-2 py-1">{ds.admin_level || "—"}</td>
                  <td className="px-2 py-1">{parseSource(ds.source)}</td>
                  <td className="px-2 py-1 text-gray-500">
                    {ds.created_at
                      ? new Date(ds.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No datasets uploaded yet.
          </p>
        )}
      </div>

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onSaved={loadDatasets} // ✅ correct prop name for new modal
        />
      )}
    </SidebarLayout>
  );
}
