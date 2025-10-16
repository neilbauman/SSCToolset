"use client";
import { useEffect, useState, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, ArrowUpDown, Loader2 } from "lucide-react";
import DatasetWizard from "./DatasetWizard";
import type { CountryParams } from "@/app/country/types";
import type { GroupKey } from "@/lib/theme";

type DatasetMeta = {
  id: string;
  title: string;
  year: number | null;
  admin_level: string | null;
  data_type: string | null;
  data_format: string | null;
  indicator_id: string | null;
  indicator_catalogue?: any;
};

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof DatasetMeta>("title");
  const [sortAsc, setSortAsc] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadDatasets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select(
        `id,title,year,admin_level,data_type,data_format,indicator_id,
         indicator_catalogue(
           name,
           indicator_taxonomy_links(
             taxonomy_terms(category,name)
           )
         )`
      )
      .eq("country_iso", params.id)
      .order("title", { ascending: true });
    if (!error && data) setDatasets(data as DatasetMeta[]);
    setLoading(false);
  }

  async function loadPreview(id: string, dataType: string | null) {
    setSelectedId(id);
    let preview: any[] = [];
    if (dataType === "categorical") {
      const { data } = await supabase
        .from("dataset_values_cat")
        .select("admin_pcode,admin_level,category_label,category_score as value")
        .eq("dataset_id", id)
        .order("admin_pcode", { ascending: true });
      if (data) preview = data;
    } else {
      const { data } = await supabase
        .from("dataset_values")
        .select("admin_pcode,admin_level,value")
        .eq("dataset_id", id)
        .order("admin_pcode", { ascending: true });
      if (data) preview = data;
    }
    setPreviewData(preview);
  }

  useEffect(() => {
    loadDatasets();
  }, []);

  const sortedDatasets = useMemo(() => {
    const sorted = [...datasets].sort((a, b) => {
      const va = a[sortField] || "";
      const vb = b[sortField] || "";
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return sorted;
  }, [datasets, sortField, sortAsc]);

  const toggleSort = (field: keyof DatasetMeta) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const headerProps = {
    title: "Other Datasets",
    group: "country-config" as GroupKey,
    description: "Additional datasets linked to this country configuration.",
    trailing: (
      <button
        onClick={() => setWizardOpen(true)}
        className="bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Add Dataset
      </button>
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-4 md:p-6 space-y-4">
        <Breadcrumbs
          items={[
            { label: "Countries", href: "/country" },
            { label: params.id.toUpperCase(), href: `/country/${params.id}` },
            { label: "Other Datasets" },
          ]}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading datasets...
          </div>
        ) : (
          <>
            <div className="text-base font-semibold text-gray-800">Other Datasets</div>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th
                      className="px-3 py-2 cursor-pointer"
                      onClick={() => toggleSort("title")}
                    >
                      Title <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </th>
                    <th
                      className="px-3 py-2 cursor-pointer"
                      onClick={() => toggleSort("year")}
                    >
                      Year <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </th>
                    <th className="px-3 py-2">Admin Level</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Format</th>
                    <th className="px-3 py-2 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDatasets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-4 italic"
                      >
                        No datasets available
                      </td>
                    </tr>
                  ) : (
                    sortedDatasets.map((d) => (
                      <tr
                        key={d.id}
                        className={`border-t hover:bg-gray-50 ${
                          selectedId === d.id ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-3 py-2">{d.title}</td>
                        <td className="px-3 py-2">{d.year ?? "-"}</td>
                        <td className="px-3 py-2">{d.admin_level ?? "-"}</td>
                        <td className="px-3 py-2">{d.data_type ?? "-"}</td>
                        <td className="px-3 py-2">{d.data_format ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => loadPreview(d.id, d.data_type)}
                            className="text-[color:var(--gsc-red)] hover:underline text-xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedId && previewData.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Data Preview — {selectedId}
            </div>
            <div className="border rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    {Object.keys(previewData[0]).map((h) => (
                      <th key={h} className="px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 15).map((r, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(r).map((v, j) => {
                        const val = v ?? "-";
                        return (
                          <td key={j} className="px-2 py-1">
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
    </SidebarLayout>
  );
}
