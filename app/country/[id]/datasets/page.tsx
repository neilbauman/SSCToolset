"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import DatasetWizard from "./DatasetWizard";
import type { CountryParams } from "@/app/country/types";

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState("title");
  const [sortAsc, setSortAsc] = useState(true);

  async function loadDatasets() {
    const { data, error } = await supabase
      .from("view_country_datasets")
      .select("*")
      .eq("country_iso", params.id);
    if (!error && data) setDatasets(data);
  }

  async function loadPreview(id: string) {
    setLoading(true);
    setPreview([]);
    try {
      let { data } = await supabase
        .from("dataset_values")
        .select("admin_pcode,admin_level,category_label,value")
        .eq("dataset_id", id)
        .order("admin_pcode");
      if (!data?.length) {
        const { data: cat } = await supabase
          .from("dataset_values_cat")
          .select("admin_pcode,admin_level,category_label,category_score as value")
          .eq("dataset_id", id)
          .order("admin_pcode");
        setPreview(cat || []);
      } else setPreview(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatasets();
  }, [params.id]);

  function sortBy(key: string) {
    const asc = key === sortKey ? !sortAsc : true;
    setSortKey(key);
    setSortAsc(asc);
    setDatasets([...datasets].sort((a, b) => {
      const A = a[key] ?? "";
      const B = b[key] ?? "";
      return asc
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    }));
  }

  const headerProps = {
    title: "Datasets",
    group: "country-config" as any,
    description: "Reusable country datasets and linked indicators.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: `/country/${params.id}` },
          { label: "Datasets", href: `/country/${params.id}/datasets` },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setWizardOpen(true)}
            className="bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Dataset
          </button>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">
              <tr>
                {[
                  "Title",
                  "Year",
                  "Admin",
                  "Type",
                  "Format",
                  "Indicator",
                  "Taxonomy Category",
                  "Taxonomy Term",
                ].map((col, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                    onClick={() =>
                      sortBy(
                        [
                          "title",
                          "year",
                          "admin_level",
                          "data_type",
                          "data_format",
                          "indicator_name",
                          "taxonomy_category",
                          "taxonomy_term",
                        ][i]
                      )
                    }
                  >
                    {col}
                    <ArrowUpDown className="inline w-3 h-3 ml-1 text-gray-400" />
                  </th>
                ))}
                <th className="px-3 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => {
                    setSelectedId(d.id);
                    loadPreview(d.id);
                  }}
                  className={`cursor-pointer ${
                    selectedId === d.id
                      ? "bg-[color:var(--gsc-beige)] font-semibold"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2">{d.title}</td>
                  <td>{d.year || "-"}</td>
                  <td>{d.admin_level}</td>
                  <td>{d.data_type}</td>
                  <td>{d.data_format}</td>
                  <td>{d.indicator_name || "-"}</td>
                  <td>{d.taxonomy_category || "-"}</td>
                  <td>{d.taxonomy_term || "-"}</td>
                  <td className="flex gap-2 justify-center">
                    <button className="p-1 border rounded hover:bg-gray-50">
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-1 border rounded hover:bg-gray-50">
                      <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedId && (
          <div className="border rounded-md mt-4">
            <div className="px-3 py-2 font-medium bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">
              Data Preview — {datasets.find((x) => x.id === selectedId)?.title}
            </div>
            <div className="p-3 text-xs overflow-auto">
              {loading ? (
                <div>Loading...</div>
              ) : preview.length === 0 ? (
                <div>No rows to display.</div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1 border-b">Admin PCode</th>
                      <th className="text-left px-2 py-1 border-b">Admin Level</th>
                      <th className="text-left px-2 py-1 border-b">Category</th>
                      <th className="text-left px-2 py-1 border-b">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 border-b">{r.admin_pcode}</td>
                        <td className="px-2 py-1 border-b">{r.admin_level}</td>
                        <td className="px-2 py-1 border-b">
                          {r.category_label || "-"}
                        </td>
                        <td className="px-2 py-1 border-b">{r.value ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {wizardOpen && (
          <DatasetWizard
            countryIso={params.id}
            onClose={() => setWizardOpen(false)}
            onSaved={() => {
              setWizardOpen(false);
              loadDatasets();
            }}
          />
        )}
      </div>
    </SidebarLayout>
  );
}
