"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  Upload,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import type { CountryParams } from "@/app/country/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Country = {
  iso_code: string;
  name: string;
};

type PopulationVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source_name: string | null;
  source_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

// -----------------------------------------------------------------------------
// Population Data Preview Component
// -----------------------------------------------------------------------------
function PopulationPreview({ versionId, title }: { versionId: string; title: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total: number; sum: number; avg: number }>({
    total: 0,
    sum: 0,
    avg: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Fetch records with pagination and optional search
      let query = supabase
        .from("population_data")
        .select("pcode,name,population", { count: "exact" })
        .eq("dataset_version_id", versionId)
        .order("pcode", { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search.trim()) {
        query = query.or(`pcode.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data, count } = await query;

      // Use the RPC for total population
      const { data: rpcData } = await supabase.rpc("sum_population_by_version", {
        version_id: versionId,
      });

      const totalPopulation = rpcData?.[0]?.sum || 0;
      const avg = count ? totalPopulation / count : 0;

      setRows(data || []);
      setSummary({
        total: count ?? 0,
        sum: totalPopulation,
        avg,
      });
      setLoading(false);
    };
    load();
  }, [versionId, page, search]);

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      {/* 🧭 Section Title */}
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--gsc-red)" }}
      >
        {title}
      </h2>

      {/* 🔍 Search + Summary */}
      <div className="flex justify-between items-center mb-3">
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
          <div className="text-center border rounded-lg p-2 bg-gray-50">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-lg font-semibold">{summary.total.toLocaleString()}</p>
          </div>
          <div className="text-center border rounded-lg p-2 bg-gray-50">
            <p className="text-sm text-gray-600">Total Population</p>
            <p className="text-lg font-semibold">{summary.sum.toLocaleString()}</p>
          </div>
          <div className="text-center border rounded-lg p-2 bg-gray-50">
            <p className="text-sm text-gray-600">Average per Record</p>
            <p className="text-lg font-semibold">
              {Math.round(summary.avg).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or pcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded pl-8 pr-2 py-1 text-sm w-60"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading population data…
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">PCode</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-right">Population</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.name ?? "—"}</td>
                  <td className="border px-2 py-1 text-right">
                    {Number(r.population || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <p>
              Page {page} of {Math.ceil(summary.total / pageSize) || 1}
            </p>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page >= Math.ceil(summary.total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm italic text-gray-500">
          No data available for this version.
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------
export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [versionStats, setVersionStats] = useState<
    Record<string, { total: number; sum: number; lowestLevel: string }>
  >({});
  const [selected, setSelected] = useState<PopulationVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editing, setEditing] = useState<PopulationVersion | null>(null);

  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  const loadVersions = async () => {
    const { data } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!data) return;

    const stats: Record<string, { total: number; sum: number; lowestLevel: string }> = {};
    for (const v of data) {
      const { count } = await supabase
        .from("population_data")
        .select("id", { count: "exact" })
        .eq("dataset_version_id", v.id);

      const { data: rpc } = await supabase.rpc("sum_population_by_version", {
        version_id: v.id,
      });

      // Find lowest admin level among rows (ADM4 > ADM3 > ADM2 > ADM1)
      const { data: levelData } = await supabase
        .from("population_data")
        .select("level")
        .eq("dataset_version_id", v.id)
        .not("level", "is", null)
        .neq("level", "")
        .limit(1000);

      const levels = (levelData || []).map((r) => r.level?.toUpperCase());
      const hierarchy = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
      const found = hierarchy.reverse().find((lvl) => levels.includes(lvl)) || "—";

      stats[v.id] = {
        total: count ?? 0,
        sum: rpc?.[0]?.sum || 0,
        lowestLevel: found,
      };
    }

    setVersions(data);
    const active = data.find((v) => v.is_active) || data[0] || null;
    setSelected(active);
    setVersionStats(stats);
  };

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  const handleDelete = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const handleActivate = async (v: PopulationVersion) => {
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", v.id);
    await loadVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Data`,
    group: "country-config" as const,
    description: "Manage versioned population datasets aligned with administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between mb-3 items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload Dataset
          </button>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th>Year</th>
                <th>Date</th>
                <th>Source</th>
                <th>Lowest Admin Level</th>
                <th>Total Population</th>
                <th>Records</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const s = versionStats[v.id] || {
                  total: 0,
                  sum: 0,
                  lowestLevel: "—",
                };
                const src = v.source_url ? (
                  <a
                    href={v.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {v.source_name}
                  </a>
                ) : (
                  <span>{v.source_name ?? "—"}</span>
                );
                const isSelected = selected?.id === v.id;

                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${
                      v.is_active ? "bg-green-50" : ""
                    } ${isSelected ? "font-bold bg-gray-100" : ""}`}
                  >
                    <td
                      onClick={() => setSelected(v)}
                      className="border px-2 py-1 cursor-pointer"
                    >
                      {v.title}
                    </td>
                    <td className="border px-2 py-1 text-center">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1 text-center">
                      {v.dataset_date ?? "—"}
                    </td>
                    <td className="border px-2 py-1">{src}</td>
                    <td className="border px-2 py-1 text-center">
                      {s.lowestLevel}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {s.sum.toLocaleString()}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {s.total.toLocaleString()}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {v.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      <div className="flex justify-end gap-2">
                        {!v.is_active && (
                          <button
                            className="text-blue-600 hover:underline text-xs"
                            onClick={() => handleActivate(v)}
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          className="text-gray-700 hover:underline text-xs flex items-center"
                          onClick={() => setEditing(v)}
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                          onClick={() => setOpenDelete(v)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No population dataset versions uploaded yet.
          </p>
        )}
      </div>

      {selected && <PopulationPreview versionId={selected.id} title={selected.title} />}

      {openUpload && (
        <UploadPopulationModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={async () => loadVersions()}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove version "${openDelete.title}".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}
      {editing && (
        <EditPopulationVersionModal
          versionId={editing.id}
          onClose={() => setEditing(null)}
          onSaved={async () => loadVersions()}
        />
      )}
    </SidebarLayout>
  );
}
