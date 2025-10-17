"use client";

import { useState, useEffect, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers,
  Upload,
  Edit3,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import DatasetPreview from "@/components/country/DatasetPreview";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };

type DatasetMeta = {
  id: string;
  title: string;
  dataset_type: string | null;
  data_format: string | null;
  admin_level: string | null;
  year: number | null;
  source_name: string | null;
  taxonomy_category: string | null;
  taxonomy_term: string | null;
  record_count: number | null;
  created_at: string;
};

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [filtered, setFiltered] = useState<DatasetMeta[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [selected, setSelected] = useState<DatasetMeta | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .maybeSingle();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select(
        `
        id,
        title,
        dataset_type,
        data_format,
        admin_level,
        year,
        source_name,
        taxonomy_category,
        taxonomy_term,
        record_count,
        created_at
      `
      )
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDatasets(data);
      setFiltered(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  useEffect(() => {
    if (!searchTerm) {
      setFiltered(datasets);
      return;
    }
    const t = searchTerm.toLowerCase();
    setFiltered(
      datasets.filter(
        (d) =>
          d.title.toLowerCase().includes(t) ||
          (d.source_name ?? "").toLowerCase().includes(t)
      )
    );
  }, [searchTerm, datasets]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset?")) return;
    await supabase.from("dataset_metadata").delete().eq("id", id);
    await loadDatasets();
    setSelected(null);
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Datasets`,
    group: "country-config" as const,
    description:
      "Catalogue of raw datasets for this country. Select a row to preview the uploaded data below.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm bg-white mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-red)]" />
            Datasets
          </h2>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" />
            Add Dataset
          </button>
        </div>

        <div className="flex items-center mb-3 border rounded px-2 py-1 w-full max-w-md bg-[var(--gsc-beige)]/40">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or source..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading datasets...
          </div>
        ) : filtered.length > 0 ? (
          <table className="w-full text-sm border rounded overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Format</th>
                <th className="px-2 py-1 text-left">Admin</th>
                <th className="px-2 py-1 text-left">Year</th>
                <th className="px-2 py-1 text-left">Source</th>
                <th className="px-2 py-1 text-left">Taxonomy Category</th>
                <th className="px-2 py-1 text-left">Taxonomy Term</th>
                <th className="px-2 py-1 text-right">Records</th>
                <th className="px-2 py-1 text-right">Created</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`border-t hover:bg-gray-50 cursor-pointer ${
                    selected?.id === d.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-2 py-1">{d.title}</td>
                  <td className="px-2 py-1">{d.dataset_type ?? "—"}</td>
                  <td className="px-2 py-1">{d.data_format ?? "—"}</td>
                  <td className="px-2 py-1">{d.admin_level ?? "—"}</td>
                  <td className="px-2 py-1">{d.year ?? "—"}</td>
                  <td className="px-2 py-1">{d.source_name ?? "—"}</td>
                  <td className="px-2 py-1">{d.taxonomy_category ?? "—"}</td>
                  <td className="px-2 py-1">{d.taxonomy_term ?? "—"}</td>
                  <td className="px-2 py-1 text-right">
                    {d.record_count ?? 0}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {new Date(d.created_at).toISOString().split("T")[0]}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(d);
                        }}
                        className="text-blue-600 hover:underline text-xs flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(d.id);
                        }}
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm mt-2">
            No datasets found.
          </p>
        )}
      </div>

      {selected && (
        <div className="mt-4">
          <DatasetPreview
  datasetId={selected.id}
  datasetType={(selected.dataset_type as "adm0" | "gradient" | "categorical") || "gradient"}
/>
        </div>
      )}

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onOpenChange={setOpenAdd}
          countryIso={countryIso}
        />
      )}
    </SidebarLayout>
  );
}
