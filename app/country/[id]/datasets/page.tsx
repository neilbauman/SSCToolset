"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Loader2,
  PlusCircle,
  ArrowUpDown,
  Search,
  Edit3,
  Trash2,
} from "lucide-react";
import DatasetPreview from "@/components/country/DatasetPreview";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import ConfirmDeleteDatasetModal from "@/components/country/ConfirmDeleteDatasetModal";
import AddDatasetModal from "@/components/country/AddDatasetModal";

type DatasetMeta = {
  id: string;
  title: string;
  dataset_type: "adm0" | "gradient" | "categorical" | string | null;
  data_format: "numeric" | "text" | string | null;
  data_type: string | null;
  admin_level: string | null;
  join_field: string | null;
  year: number | null;
  source_name: string | null;
  source_url: string | null;
  unit: string | null;
  record_count: number | null;
  created_at: string;
  country_iso: string;
  indicator_id: string | null;
};

type SortKey =
  | "title"
  | "dataset_type"
  | "data_format"
  | "data_type"
  | "admin_level"
  | "year"
  | "source_name"
  | "taxonomy_category"
  | "taxonomy_term"
  | "record_count"
  | "created_at";

type TaxInfo = { category: string | null; term: string | null };

export default function CountryDatasetsPage() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DatasetMeta[]>([]);
  const [tax, setTax] = useState<Record<string, TaxInfo>>({});
  const [selected, setSelected] = useState<DatasetMeta | null>(null);

  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [editing, setEditing] = useState<DatasetMeta | null>(null);
  const [deleting, setDeleting] = useState<DatasetMeta | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!iso) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("*")
      .eq("country_iso", iso)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as DatasetMeta[];
    setRows(list);

    const indicatorIds = Array.from(
      new Set(list.map((d) => d.indicator_id).filter(Boolean))
    ) as string[];

    if (indicatorIds.length) {
      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id,taxonomy_id")
        .in("indicator_id", indicatorIds);

      const termIds = Array.from(
        new Set((links || []).map((l: any) => l.taxonomy_id).filter(Boolean))
      );
      let termsById: Record<
        string,
        { category: string | null; name: string | null }
      > = {};
      if (termIds.length) {
        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id,category,name")
          .in("id", termIds);
        (terms || []).forEach(
          (t: any) =>
            (termsById[t.id] = { category: t.category, name: t.name })
        );
      }
      const map: Record<string, TaxInfo> = {};
      (links || []).forEach((l: any) => {
        const t = termsById[l.taxonomy_id];
        if (!t) return;
        if (!map[l.indicator_id])
          map[l.indicator_id] = { category: t.category, term: t.name };
      });
      setTax(map);
    } else {
      setTax({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [iso]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows;
    if (needle) {
      r = r.filter((d) =>
        [
          d.title,
          d.dataset_type ?? "",
          d.data_format ?? "",
          d.data_type ?? "",
          d.admin_level ?? "",
          d.year ?? "",
          d.source_name ?? "",
          tax[d.indicator_id || ""]?.category ?? "",
          tax[d.indicator_id || ""]?.term ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }
    return [...r].sort((a, b) => {
      const A =
        sortBy === "taxonomy_category"
          ? tax[a.indicator_id || ""]?.category
          : sortBy === "taxonomy_term"
          ? tax[a.indicator_id || ""]?.term
          : (a as any)[sortBy];
      const B =
        sortBy === "taxonomy_category"
          ? tax[b.indicator_id || ""]?.category
          : sortBy === "taxonomy_term"
          ? tax[b.indicator_id || ""]?.term
          : (b as any)[sortBy];
      if (A === B) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      if (typeof A === "number" && typeof B === "number")
        return sortDir === "asc" ? A - B : B - A;
      const as = String(A).toLowerCase();
      const bs = String(B).toLowerCase();
      return sortDir === "asc" ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
    });
  }, [rows, q, sortBy, sortDir, tax]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  }

  async function cascadeDelete(d: DatasetMeta) {
    await supabase.from("dataset_values").delete().eq("dataset_id", d.id);
    await supabase.from("dataset_values_cat").delete().eq("dataset_id", d.id);
    await supabase.from("dataset_category_maps").delete().eq("dataset_id", d.id);
    await supabase.from("dataset_metadata").delete().eq("id", d.id);
    setRows((prev) => prev.filter((x) => x.id !== d.id));
    if (selected?.id === d.id) setSelected(null);
  }

  const headerProps = {
    title: `${iso} – Datasets`,
    group: "country-config" as const,
    description:
      "Catalogue of raw datasets. Select a row to preview the raw uploaded data below.",
    tool: "Dataset Manager",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: iso, href: `/country/${iso}` },
          { label: "Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div
        className="rounded-xl p-3 flex items-center justify-between"
        style={{
          background: "var(--gsc-beige)",
          border: "1px solid var(--gsc-light-gray)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="text-sm text-[var(--gsc-gray)]">
            <span className="font-semibold">{filtered.length}</span> datasets
          </div>
          <div className="relative ml-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, type, format, source, taxonomy…"
              className="rounded-lg border px-8 py-1 text-sm"
              style={{ borderColor: "var(--gsc-light-gray)" }}
            />
            <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-white"
          style={{ background: "var(--gsc-red)" }}
        >
          <PlusCircle className="h-4 w-4" />
          Add Dataset
        </button>
      </div>

      <div
        className="overflow-auto rounded-xl"
        style={{ border: "1px solid var(--gsc-light-gray)" }}
      >
        <table className="min-w-full text-sm">
          <thead
            className="text-xs uppercase"
            style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}
          >
            <tr>
              {[
                ["title", "Title"],
                ["dataset_type", "Type"],
                ["data_format", "Format"],
                ["data_type", "Data Type"],
                ["admin_level", "Admin"],
                ["year", "Year"],
                ["source_name", "Source"],
                ["taxonomy_category", "Taxonomy Category"],
                ["taxonomy_term", "Taxonomy Term"],
                ["record_count", "Records"],
                ["created_at", "Created"],
                ["actions", "Actions"],
              ].map(([key, label]) => (
                <th key={key} className="px-2 py-2 whitespace-nowrap">
                  {key === "actions" ? (
                    label
                  ) : (
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort(key as SortKey)}
                      title={`Sort by ${label}`}
                    >
                      {label}
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={12}>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading datasets…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-2 py-3 text-red-700" colSpan={12}>
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={12}>
                  No datasets match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const isSel = selected?.id === d.id;
                const t = d.indicator_id ? tax[d.indicator_id] : undefined;
                return (
                  <tr
                    key={d.id}
                    style={{
                      background: isSel ? "rgba(0,75,135,0.06)" : "white",
                      borderTop: "1px solid var(--gsc-light-gray)",
                    }}
                  >
                    <td
                      className="px-2 py-2 font-medium cursor-pointer"
                      onClick={() => setSelected(isSel ? null : d)}
                    >
                      {d.title}
                    </td>
                    <td className="px-2 py-2">{d.dataset_type ?? d.data_type}</td>
                    <td className="px-2 py-2">{d.data_format ?? "—"}</td>
                    <td className="px-2 py-2">{d.data_type ?? "—"}</td>
                    <td className="px-2 py-2">{d.admin_level ?? "—"}</td>
                    <td className="px-2 py-2">{d.year ?? "—"}</td>
                    <td className="px-2 py-2">{d.source_name ?? "—"}</td>
                    <td className="px-2 py-2">{t?.category ?? "—"}</td>
                    <td className="px-2 py-2">{t?.term ?? "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {d.record_count ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="Edit dataset metadata"
                          onClick={() => setEditing(d)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="Delete dataset"
                          onClick={() => setDeleting(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--gsc-beige)",
            border: "1px solid var(--gsc-light-gray)",
          }}
        >
          <DatasetPreview
            datasetId={selected.id}
            datasetType={
              (selected.dataset_type as "adm0" | "gradient" | "categorical") ||
              "gradient"
            }
          />
        </div>
      )}

      {adding && (
        <AddDatasetModal
          open={adding}
          onOpenChange={(v) => {
            setAdding(v);
            if (!v) load();
          }}
          countryIso={iso}
        />
      )}
      {editing && (
        <EditDatasetModal
          dataset={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === updated.id ? (updated as DatasetMeta) : r
              )
            );
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDeleteDatasetModal
          title={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await cascadeDelete(deleting);
            setDeleting(null);
          }}
        />
      )}
    </SidebarLayout>
  );
}
