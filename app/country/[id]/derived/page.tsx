"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, PlusCircle, Trash2, RefreshCcw } from "lucide-react";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";

type DerivedRow = {
  derived_dataset_id: string;
  derived_title: string;
  admin_level: string | null;
  year: number | null;
  record_count: number | null;
  data_health: string | null;
  created_at: string;
};

export default function CountryDerivedDatasetsPage() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DerivedRow[]>([]);
  const [creating, setCreating] = useState(false);

  // -----------------------------
  // Load derived datasets
  // -----------------------------
  async function reloadDerived() {
    if (!iso) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("view_derived_dataset_summary")
      .select("*")
      .eq("country_iso", iso)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data || []) as DerivedRow[]);
    setLoading(false);
  }

  useEffect(() => {
    reloadDerived();
  }, [iso]);

  // -----------------------------
  // Delete derived dataset
  // -----------------------------
  async function deleteDerived(row: DerivedRow) {
    if (!confirm(`Delete derived dataset "${row.derived_title}"?`)) return;
    await supabase
      .from("derived_datasets")
      .delete()
      .eq("id", row.derived_dataset_id);
    reloadDerived();
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – Derived Datasets`,
        group: "country-config",
        description:
          "Manage derived and analytical datasets generated through joins or formulas.",
        tool: "Derived Datasets",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Country Configuration", href: "/country" },
              { label: iso, href: `/country/${iso}` },
              { label: "Derived Datasets" },
            ]}
          />
        ),
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[color:var(--gsc-red)]">
          Derived Datasets
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-white"
          style={{ background: "var(--gsc-red)" }}
        >
          <PlusCircle className="h-4 w-4" />
          Create Derived Dataset
        </button>
      </div>

      <div className="rounded-xl border p-3 bg-[var(--gsc-beige)]">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{rows.length}</span> derived datasets
          </div>
          <button
            onClick={reloadDerived}
            className="flex items-center gap-1 text-sm text-[color:var(--gsc-gray)] hover:text-[color:var(--gsc-red)]"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Admin Level</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-right">Records</th>
                <th className="px-3 py-2 text-left">Health</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={6}>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading derived datasets…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-3 py-3 text-red-700" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={6}>
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.derived_dataset_id} className="border-t">
                    <td className="px-3 py-2">{r.derived_title}</td>
                    <td className="px-3 py-2">{r.admin_level ?? "—"}</td>
                    <td className="px-3 py-2">{r.year ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.record_count ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.data_health ?? "unknown"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => deleteDerived(r)}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Derived Dataset Wizard */}
      {creating && (
       <CreateDerivedDatasetWizard_JoinAware
  open={open}
  onClose={() => setOpen(false)}
  countryIso={countryIso}
  onCreated={() => setRefreshKey((k) => k + 1)} // ✅ triggers refresh after save
/>
      )}
    </SidebarLayout>
  );
}
