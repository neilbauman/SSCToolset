"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, PlusCircle } from "lucide-react";
import DerivedDatasetTable, {
  DerivedRow,
  SortKey,
} from "@/components/country/DerivedDatasetTable";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";

export default function CountryDerivedDatasetsPage() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DerivedRow[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
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
    load();
  }, [iso]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const A = (a as any)[sortBy];
      const B = (b as any)[sortBy];
      if (A === B) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      if (typeof A === "number" && typeof B === "number") {
        return sortDir === "asc" ? A - B : B - A;
      }
      const as = String(A).toLowerCase();
      const bs = String(B).toLowerCase();
      return sortDir === "asc" ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
    });
    return sorted;
  }, [rows, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  }

  async function handleDelete(row: DerivedRow) {
    await supabase.from("derived_datasets").delete().eq("id", row.derived_dataset_id);
    setRows((prev) => prev.filter((r) => r.derived_dataset_id !== row.derived_dataset_id));
  }

  async function handleRegenerate(row: DerivedRow) {
    console.log("Regenerate derived dataset", row.derived_dataset_id);
    // Future: trigger RPC to rebuild derived dataset
  }

  if (!iso) {
    return (
      <SidebarLayout
        headerProps={{
          title: "Loading country…",
          group: "country-config",
          description: "Waiting for route params.",
          tool: "Derived Datasets",
          breadcrumbs: (
            <Breadcrumbs
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Country Configuration", href: "/country" },
                { label: "Derived Datasets" },
              ]}
            />
          ),
        }}
      >
        <div className="rounded-xl border p-3 text-sm text-gray-600">
          Country ID missing in route.
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – Derived Datasets`,
        group: "country-config",
        description:
          "View, manage, and create analytical datasets derived from joins of population, admin, GIS, and other data.",
        tool: "Derived Dataset Manager",
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
      {/* Header and create button */}
      <div className="flex items-center justify-between mb-3 mt-4">
        <h2 className="text-xl font-bold text-[color:var(--gsc-red)]">
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

      {loading ? (
        <div className="p-3 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
          Loading derived datasets…
        </div>
      ) : error ? (
        <div className="p-3 text-red-700">{error}</div>
      ) : (
        <DerivedDatasetTable
          rows={sortedRows}
          loading={loading}
          error={error}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          onSelect={setSelectedId}
          selectedId={selectedId}
          onDelete={handleDelete}
          onRegenerate={handleRegenerate}
          countryIso={iso}
        />
      )}

      {creating && (
        <CreateDerivedDatasetWizard_JoinAware
          open={creating}
          countryIso={iso}
          onClose={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </SidebarLayout>
  );
}
