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
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";
import DerivedDatasetTable from "@/components/country/DerivedDatasetTable";

type Row = {
  derived_dataset_id: string;
  country_iso: string | null;
  derived_title: string;
  year: number | null;
  admin_level: string | null;
  record_count: number | null;
  data_health: "good" | "fair" | "poor" | string | null;
  join_id: string | null;
  join_active: boolean | null;
  join_notes: string | null;
  linked_count: number | null;
  domains: string | null; // “Shelter + WASH”, etc.
  created_at: string;
};

type SortKey =
  | "derived_title"
  | "admin_level"
  | "year"
  | "record_count"
  | "data_health"
  | "linked_count"
  | "domains"
  | "join_active"
  | "created_at";

export default function CountryDerivedPage() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [creating, setCreating] = useState(false);

  // selection (right now just for health preview)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    if (!iso) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("view_derived_dataset_summary")
      .select("*")
      .eq("country_iso", iso)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRows((data || []) as Row[]);
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
          d.derived_title,
          d.admin_level ?? "",
          d.year ?? "",
          d.data_health ?? "",
          d.domains ?? "",
          d.join_notes ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }
    return [...r].sort((a, b) => {
      const A = (a as any)[sortBy];
      const B = (b as any)[sortBy];
      if (A === B) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      if (typeof A === "number" && typeof B === "number")
        return sortDir === "asc" ? A - B : B - A;
      // booleans first when sorting join_active
      if (typeof A === "boolean" && typeof B === "boolean")
        return sortDir === "asc" ? Number(A) - Number(B) : Number(B) - Number(A);
      const as = String(A).toLowerCase();
      const bs = String(B).toLowerCase();
      return sortDir === "asc" ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
    });
  }, [rows, q, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  }

  // delete derived dataset (metadata only; no value rows exist yet)
  async function handleDelete(row: Row) {
    await supabase.from("derived_datasets").delete().eq("id", row.derived_dataset_id);
    setRows((prev) => prev.filter((r) => r.derived_dataset_id !== row.derived_dataset_id));
    if (selectedId === row.derived_dataset_id) setSelectedId(null);
  }

  // stub for regenerate (hook up to your future RPC)
  async function handleRegenerate(_row: Row) {
    // Placeholder: in future call a regenerate RPC then refresh record_count/data_health
    await load();
  }

  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – Derived Datasets`,
        group: "country-config",
        description:
          "Create and manage derived datasets by joining existing sources. Previews are computed via RPC; metadata is stored in derived_datasets.",
        tool: "Derived Dataset Manager",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Country Configuration", href: "/country" },
              { label: iso, href: `/country/${iso}` },
              { label: "Derived" },
            ]}
          />
        ),
      }}
    >
      {/* Header controls */}
      <h2 className="text-xl font-bold text-[color:var(--gsc-red)] mb-2 mt-4">
        Derived Datasets
      </h2>

      <div
        className="rounded-xl p-3 flex items-center justify-between"
        style={{
          background: "var(--gsc-beige)",
          border: "1px solid var(--gsc-light-gray)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="text-sm text-[var(--gsc-gray)]">
            <span className="font-semibold">{filtered.length}</span> items
          </div>
          <div className="relative ml-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, level, year, health, domain…"
              className="rounded-lg border px-8 py-1 text-sm"
              style={{ borderColor: "var(--gsc-light-gray)" }}
            />
            <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-white"
          style={{ background: "var(--gsc-red)" }}
        >
          <PlusCircle className="h-4 w-4" />
          Create Derived Dataset
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-auto rounded-xl mt-3"
        style={{ border: "1px solid var(--gsc-light-gray)" }}
      >
        <table className="min-w-full text-sm">
          <thead
            className="text-xs uppercase"
            style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}
          >
            <tr>
              {[
                ["derived_title", "Title"],
                ["admin_level", "Admin"],
                ["year", "Year"],
                ["record_count", "Records"],
                ["data_health", "Health"],
                ["domains", "Domains"],
                ["linked_count", "# Linked"],
                ["join_active", "Join Active"],
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
                <td className="px-2 py-3 text-gray-500" colSpan={10}>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading derived datasets…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-2 py-3 text-red-700" colSpan={10}>
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={10}>
                  No derived datasets match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const isSel = selectedId === d.derived_dataset_id;
                return (
                  <tr
                    key={d.derived_dataset_id}
                    style={{
                      background: isSel ? "rgba(0,75,135,0.06)" : "white",
                      borderTop: "1px solid var(--gsc-light-gray)",
                    }}
                  >
                    <td
                      className="px-2 py-2 font-medium cursor-pointer"
                      onClick={() =>
                        setSelectedId(isSel ? null : d.derived_dataset_id)
                      }
                    >
                      {d.derived_title}
                    </td>
                    <td className="px-2 py-2">{d.admin_level ?? "—"}</td>
                    <td className="px-2 py-2">{d.year ?? "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {d.record_count ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      {d.data_health ? (
                        <div className="border rounded bg-white p-1 inline-block">
                          <DatasetHealth datasetId={d.derived_dataset_id} />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">{d.domains ?? "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {d.linked_count ?? 0}
                    </td>
                    <td className="px-2 py-2">
                      {d.join_active === null
                        ? "—"
                        : d.join_active
                        ? "Yes"
                        : "No"}
                    </td>
                    <td className="px-2 py-2">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="View details"
                          onClick={() =>
                            setSelectedId(
                              selectedId === d.derived_dataset_id
                                ? null
                                : d.derived_dataset_id
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="Regenerate (coming soon)"
                          onClick={() => handleRegenerate(d)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="Delete derived dataset"
                          onClick={() => handleDelete(d)}
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

      {/* Selected row detail (simple, non-intrusive) */}
      {selectedId && (
        <div
          className="rounded-xl p-3 mt-3"
          style={{
            background: "var(--gsc-beige)",
            border: "1px solid var(--gsc-light-gray)",
          }}
        >
          <div className="text-sm text-gray-700">
            Selected Derived Dataset:{" "}
            <span className="font-semibold">{selectedId}</span>
          </div>
        </div>
      )}

      {/* Wizard modal */}
      {creating && (
        <CreateDerivedDatasetWizard_JoinAware
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={() => load()}
          countryIso={iso}
        />
      )}
    </SidebarLayout>
  );
}
