"use client";

import { ArrowUpDown, Eye, RefreshCw, Trash2 } from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";

export type DerivedRow = {
  derived_dataset_id: string;
  derived_title: string;
  admin_level: string | null;
  year: number | null;
  record_count: number | null;
  data_health: "good" | "fair" | "poor" | string | null;
  domains: string | null;
  linked_count: number | null;
  join_active: boolean | null;
  created_at: string;
};

export type SortKey =
  | "derived_title"
  | "admin_level"
  | "year"
  | "record_count"
  | "data_health"
  | "domains"
  | "linked_count"
  | "join_active"
  | "created_at";

export default function DerivedDatasetTable({
  rows,
  loading,
  error,
  sortBy,
  sortDir,
  onSort,
  onSelect,
  selectedId,
  onDelete,
  onRegenerate,
  countryIso,
}: {
  rows: DerivedRow[];
  loading: boolean;
  error: string | null;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onDelete: (row: DerivedRow) => void;
  onRegenerate: (row: DerivedRow) => void;
  countryIso?: string;
}) {
  void countryIso;

  return (
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
            {([
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
            ] as [SortKey | "actions", string][]).map(([k, label]) => (
              <th key={k} className="px-2 py-2 whitespace-nowrap">
                {k === "actions" ? (
                  label
                ) : (
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => onSort(k as SortKey)}
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
                Loading…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td className="px-2 py-3 text-red-700" colSpan={10}>
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-2 py-3 text-gray-500" colSpan={10}>
                No derived datasets found.
              </td>
            </tr>
          ) : (
            rows.map((d) => {
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
                    onClick={() => onSelect(isSel ? "" : d.derived_dataset_id)}
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
                          onSelect(isSel ? "" : d.derived_dataset_id)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        title="Regenerate"
                        onClick={() => onRegenerate(d)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        title="Delete"
                        onClick={() => onDelete(d)}
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
  );
}
