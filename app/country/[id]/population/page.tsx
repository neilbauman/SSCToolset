"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Upload, FileDown, Pencil, Trash2, CheckCircle2, Link2, Archive } from "lucide-react";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
// NOTE: To avoid prop drift build errors, we only pass totalUnits into DatasetHealth.
import DatasetHealth from "@/components/country/DatasetHealth";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number;
  dataset_date: string | null;
  source: string | null;
  created_at: string;
  is_active: boolean;
  notes?: string | null;
};

type PopRow = {
  id: string;
  country_iso: string;
  dataset_version_id: string;
  pcode: string;
  population: number | null;
  level: string | null;
  created_at?: string;
};

type AdminVersion = { id: string; is_active: boolean };
type AdminUnit = { pcode: string; level: string };

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  // Top-level state
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopVersion | null>(null);
  const [rows, setRows] = useState<PopRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [editVersion, setEditVersion] = useState<PopVersion | null>(null);

  // UI state (list view)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Fetch country
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    })();
  }, [countryIso]);

  // Fetch versions + determine active + load rows for selected
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching population versions:", error);
      return;
    }
    const v = (data || []) as PopVersion[];
    setVersions(v);
    const active = v.find((x) => x.is_active);
    if (active) {
      setActiveVersion(active);
      await fetchRows(active.id);
    } else {
      setActiveVersion(null);
      setRows([]);
    }
  };

  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  const fetchRows = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("id,country_iso,dataset_version_id,pcode,population,level,created_at")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching population_data:", error);
      return;
    }
    setRows((data || []) as PopRow[]);
  };

  const handleSelectVersion = async (v: PopVersion) => {
    setActiveVersion(v);
    await fetchRows(v.id);
    setPage(1);
  };

  const handleMakeActive = async (versionId: string) => {
    // deactivate all
    const { error: e1 } = await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    if (e1) {
      console.error("Failed to deactivate others:", e1);
      return;
    }
    // activate selected
    const { error: e2 } = await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);
    if (e2) {
      console.error("Failed to activate version:", e2);
      return;
    }
    await fetchVersions();
  };

  const handleDeleteVersion = async (v: PopVersion) => {
    // Soft check: if linked in dataset_joins, block hard delete
    const { data: linked } = await supabase
      .from("dataset_joins")
      .select("id")
      .eq("country_iso", countryIso)
      .eq("population_dataset_id", v.id)
      .limit(1);

    if (linked && linked.length > 0) {
      alert("This version is currently linked in a Join. Unlink it first, or Archive instead.");
      return;
    }

    // Nuke rows for the version, then delete version
    const { error: e1 } = await supabase
      .from("population_data")
      .delete()
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", v.id);
    if (e1) {
      console.error("Failed to delete population_data for version:", e1);
      return;
    }
    const { error: e2 } = await supabase
      .from("population_dataset_versions")
      .delete()
      .eq("id", v.id);
    if (e2) {
      console.error("Failed to delete population version:", e2);
      return;
    }
    if (activeVersion?.id === v.id) {
      setActiveVersion(null);
      setRows([]);
    }
    await fetchVersions();
  };

  // Linked/Archived badges, Level & Completeness
  const [linkedVersionIds, setLinkedVersionIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("dataset_joins")
        .select("population_dataset_id,is_active")
        .eq("country_iso", countryIso);
      if (error) return;
      const set = new Set<string>();
      (data || []).forEach((d: any) => {
        if (d.population_dataset_id) set.add(d.population_dataset_id);
      });
      setLinkedVersionIds(set);
    })();
  }, [countryIso, versions.length]);

  const lowestLevelForVersion = (versionId: string) => {
    const lvls = rows
      .filter((r) => r.dataset_version_id === versionId && r.level)
      .map((r) => r.level!.toUpperCase());
    if (lvls.length === 0) return null;
    // levels like ADM0..ADM5 -> choose *lowest* (highest number)
    const ord = (s: string) => (s.startsWith("ADM") ? parseInt(s.slice(3) || "0", 10) : 99);
    return lvls.sort((a, b) => ord(b) - ord(a))[0];
  };

  // Health: completeness vs active Admin Units at that level
  const [adminActiveVersionId, setAdminActiveVersionId] = useState<string | null>(null);
  const [adminUnitCountsByLevel, setAdminUnitCountsByLevel] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const { data: av } = await supabase
        .from("admin_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .maybeSingle();
      const adminVid = (av as AdminVersion | null)?.id || null;
      setAdminActiveVersionId(adminVid);
      if (!adminVid) {
        setAdminUnitCountsByLevel({});
        return;
      }
      const { data: aus } = await supabase
        .from("admin_units")
        .select("pcode,level")
        .eq("country_iso", countryIso)
        .eq("dataset_version_id", adminVid);
      const counts: Record<string, number> = {};
      (aus || []).forEach((u: AdminUnit) => {
        const lvl = (u.level || "").toUpperCase();
        counts[lvl] = (counts[lvl] || 0) + 1;
      });
      setAdminUnitCountsByLevel(counts);
    })();
  }, [countryIso]);

  const selectedLowestLevel = useMemo(() => {
    return activeVersion ? lowestLevelForVersion(activeVersion.id) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion, rows.length]);

  const completenessPct = useMemo(() => {
    if (!activeVersion) return null;
    const lv = selectedLowestLevel;
    if (!lv) return null;
    const denom = adminUnitCountsByLevel[lv] || 0;
    if (denom === 0) return null;
    const num = rows.filter((r) => (r.level || "").toUpperCase() === lv && r.population !== null).length;
    return Math.round((num / denom) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, selectedLowestLevel, adminUnitCountsByLevel, activeVersion?.id]);

  // Filtering + pagination
  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.pcode.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const downloadTemplate = () => {
    const csv = ["pcode,population", "ADM1001,10000", "ADM1002,5000"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Country Config - Population Template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Versioned population datasets aligned to Admin Units.",
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
      {/* Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length === 0 ? (
          <p className="italic text-gray-500">No versions uploaded yet.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Badges</th>
                <th className="border px-2 py-1 text-left">Lowest ADM</th>
                <th className="border px-2 py-1 text-left">% Complete</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const isSelected = activeVersion?.id === v.id;
                const lv = v.id === activeVersion?.id ? selectedLowestLevel : lowestLevelForVersion(v.id);
                const isLinked = linkedVersionIds.has(v.id);
                const isArchived = !v.is_active;
                const pct = v.id === activeVersion?.id ? completenessPct : null;
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                    <td className="border px-2 py-1">{v.title || `Population ${v.year}`}</td>
                    <td className="border px-2 py-1">{v.year}</td>
                    <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                    <td className="border px-2 py-1">{v.source || "—"}</td>
                    <td className="border px-2 py-1">
                      <div className="flex gap-2 items-center">
                        {v.is_active && (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                        {isLinked && (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs">
                            <Link2 className="w-3 h-3" /> Linked
                          </span>
                        )}
                        {isArchived && !v.is_active && (
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-2 py-1">{lv || "—"}</td>
                    <td className="border px-2 py-1">{pct != null ? `${pct}%` : "—"}</td>
                    <td className="border px-2 py-1">
                      <div className="flex gap-3">
                        <button className="text-blue-600 hover:underline" onClick={() => handleSelectVersion(v)}>
                          Select
                        </button>
                        {!v.is_active && (
                          <button
                            className="text-green-700 hover:underline"
                            onClick={() => handleMakeActive(v.id)}
                          >
                            Make Active
                          </button>
                        )}
                        <button className="text-gray-700 hover:underline" onClick={() => setEditVersion(v)}>
                          <Pencil className="w-4 h-4 inline mr-1" />
                          Edit
                        </button>
                        <button className="text-red-700 hover:underline" onClick={() => handleDeleteVersion(v)}>
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Health — pass only safe props to avoid prop-drift build breaks */}
      <div className="max-w-md">
        <DatasetHealth totalUnits={rows.length} />
        <div className="mt-3 text-sm text-gray-700 border rounded p-3">
          <div><strong>Lowest ADM level (selected):</strong> {selectedLowestLevel || "—"}</div>
          <div><strong>Completeness vs active Admin Units:</strong> {completenessPct != null ? `${completenessPct}%` : "—"}</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Population Rows {activeVersion ? `— ${activeVersion.title || `Population ${activeVersion.year}`}` : ""}</h2>
          <input
            type="text"
            placeholder="Search by PCode…"
            className="border rounded px-3 py-1 text-sm w-64"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {rows.length === 0 ? (
          <p className="italic text-gray-500">No data found for the selected version.</p>
        ) : (
          <>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">PCode</th>
                  <th className="border px-2 py-1 text-left">Population</th>
                  <th className="border px-2 py-1 text-left">Level</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{r.pcode}</td>
                    <td className="border px-2 py-1">{r.population ?? "—"}</td>
                    <td className="border px-2 py-1">{r.level ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-sm text-gray-700">
              <span>Showing {paginated.length} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border rounded px-2 py-1 disabled:opacity-50"
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border rounded px-2 py-1 disabled:opacity-50"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
      {editVersion && (
        <EditPopulationVersionModal
          open={!!editVersion}
          onClose={() => setEditVersion(null)}
          version={editVersion}
          onSaved={fetchVersions}
        />
      )}
    </SidebarLayout>
  );
}
