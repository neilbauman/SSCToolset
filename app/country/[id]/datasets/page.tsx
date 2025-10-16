"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database, PlusCircle, Eye } from "lucide-react";
import Link from "next/link";

type DatasetMeta = {
  id: string;
  title: string;
  admin_level: string | null;
  data_type: string | null;
  data_format: string | null;
  dataset_type: string | null;
  year: number | null;
  unit: string | null;
  country_iso: string;
  created_at: string;
};

type Row = Record<string, unknown>;

export default function CountryDatasetsPage({ params }: { params: { id: string } }) {
  const iso = params.id.toUpperCase();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("*")
        .eq("country_iso", iso)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setDatasets(data || []);
      setLoading(false);
    })();
  }, [iso]);

  async function loadPreview(meta: DatasetMeta) {
    setSelected(meta);
    setRows([]);
    const isCat = meta.dataset_type === "categorical" || meta.data_type === "categorical";
    const table = isCat ? "dataset_values_cat" : "dataset_values";
    const fields = isCat
      ? "admin_pcode, admin_level, category_label, category_score"
      : "admin_pcode, admin_level, value, unit";
    const { data, error } = await supabase.from(table).select(fields).eq("dataset_id", meta.id).limit(1000);
    if (error) setError(error.message);
    else setRows((data as Row[]) || []);
  }

  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – Datasets`,
        group: "country-config",
        description: "Upload, view, and manage datasets for SSC.",
        tool: "Dataset Manager",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Countries", href: "/country" },
              { label: iso, href: `/country/${iso}` },
              { label: "Datasets" },
            ]}
          />
        ),
      }}
    >
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading datasets...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{datasets.length} datasets</h2>
              <Link
                href={`/country/${iso}/datasets/add`}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-800"
              >
                <PlusCircle className="h-4 w-4" />
                Add Dataset
              </Link>
            </div>

            {datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No datasets yet. Click <b>Add Dataset</b> to begin.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-2">Title</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Admin</th>
                      <th className="px-2 py-2">Year</th>
                      <th className="px-2 py-2 text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-2 font-medium">{d.title}</td>
                        <td className="px-2 py-2">{d.dataset_type ?? d.data_type}</td>
                        <td className="px-2 py-2">{d.admin_level}</td>
                        <td className="px-2 py-2">{d.year ?? "—"}</td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => loadPreview(d)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-100"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected && (
              <div className="rounded-2xl border p-4">
                <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {selected.title}
                </h3>
                {rows.length === 0 ? (
                  <div className="text-sm text-gray-500">No rows found.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(rows[0] as Row).map((k) => (
                            <th key={k} className="border-b px-2 py-1 text-left">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 50).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => {
                              let out = "-";
                              if (v !== null && v !== undefined) out = typeof v === "object" ? JSON.stringify(v) : String(v);
                              return (
                                <td key={j} className="border-b px-2 py-1">
                                  {out}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
