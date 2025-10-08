"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers, Database, Upload, Edit3, Trash2, CheckCircle2, Download
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string; };

type AdminVersion = {
  id: string;
  country_iso: string | null;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
};

type Snapshot = {
  place_uid: string;
  parent_uid: string | null;
  name: string;
  pcode: string;
  level: number;   // same as depth
  depth: number;   // 1..N (ADM1..)
  path_uid: string[] | null;
};

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [totalUnits, setTotalUnits] = useState<number>(0);

  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1]); // user intent

  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const fetchingRef = useRef(false);

  // ---------- Country ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .maybeSingle();
      if (data) setCountry(data as Country);
    })();
  }, [countryIso]);

  // ---------- Versions ----------
  const loadVersions = async () => {
    const { data } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    const list = data ?? [];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    setSelectedVersion(active || list[0] || null);
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  // ---------- Fetch ALL snapshots for selected version (paged) ----------
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedVersion || fetchingRef.current) return;
      fetchingRef.current = true;
      setSnapshots([]);
      setLoadingMsg("");
      setProgress(0);

      try {
        const head = await supabase
          .from("place_snapshots")
          .select("place_uid", { count: "exact", head: true })
          .eq("dataset_version_id", selectedVersion.id);

        const total = head.count ?? 0;
        setTotalUnits(total);
        if (!total) { setProgress(100); fetchingRef.current = false; return; }

        const pageSize = 10000;
        const pages = Math.ceil(total / pageSize);
        setLoadingMsg(`Loading ${total.toLocaleString()} places…`);
        const all: Snapshot[] = [];

        for (let i = 0; i < pages; i++) {
          const from = i * pageSize;
          const to = Math.min(from + pageSize - 1, total - 1);
          const { data, error } = await supabase
            .from("place_snapshots")
            .select("place_uid,parent_uid,name,pcode,level,depth,path_uid")
            .eq("dataset_version_id", selectedVersion.id)
            .order("pcode", { ascending: true }) // stable ordering
            .range(from, to);

          if (error) throw error;
          all.push(...(data as Snapshot[]));
          setProgress(Math.round(((i + 1) / pages) * 100));
        }

        setSnapshots(all);
        setLoadingMsg("");
      } catch (e) {
        console.error("Snapshot fetch error:", e);
        setLoadingMsg("Failed to load places.");
      } finally {
        fetchingRef.current = false;
      }
    };
    fetchAll();
  }, [selectedVersion]);

  // ---------- Level toggles (normalize: selecting ADM3 implies ADM1+2) ----------
  const toggleLevel = (lvl: number) => {
    setSelectedLevels((prev) => {
      const s = new Set(prev);
      if (s.has(lvl)) {
        // turn off lvl and higher
        for (let i = lvl; i <= 5; i++) s.delete(i);
      } else {
        // turn on lvl and all lower
        for (let i = 1; i <= lvl; i++) s.add(i);
      }
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const normLevels = useMemo(() => {
    if (selectedLevels.length === 0) return [1];
    const max = Math.max(...selectedLevels);
    return Array.from({ length: max }, (_, i) => i + 1); // 1..max
  }, [selectedLevels]);

  const targetDepth = useMemo(() => Math.max(...normLevels), [normLevels]);

  // ---------- Fast UID map of ALL snapshots ----------
  const byUid = useMemo(() => {
    const m = new Map<string, Snapshot>();
    snapshots.forEach((s) => m.set(s.place_uid, s));
    return m;
  }, [snapshots]);

  // ---------- Table rows: build lineage for deepest level only ----------
  const tableRows = useMemo(() => {
    if (!snapshots.length) return [];
    const deepest = snapshots
      .filter((s) => s.depth === targetDepth)
      .sort((a, b) => a.pcode.localeCompare(b.pcode));

    return deepest.map((leaf) => {
      const row: Record<string, string> = {};
      let cur: Snapshot | undefined = leaf;
      // Walk up to ADM1 using the full map (NOT filtered), filling requested levels
      while (cur) {
        if (normLevels.includes(cur.depth)) {
          row[`ADM${cur.depth}`] = cur.name;
        }
        cur = cur.parent_uid ? byUid.get(cur.parent_uid) : undefined;
      }
      // Ensure every selected column has a value
      normLevels.forEach((lvl) => {
        if (!row[`ADM${lvl}`]) row[`ADM${lvl}`] = "—";
      });
      return row;
    });
  }, [snapshots, targetDepth, normLevels, byUid]);

  // ---------- Delete / Activate ----------
  const handleDeleteVersion = async (v: AdminVersion) => {
    await supabase.from("place_snapshots").delete().eq("dataset_version_id", v.id);
    await supabase.from("admin_units").delete().eq("dataset_version_id", v.id);
    await supabase.from("admin_dataset_versions").delete().eq("id", v.id);
    setOpenDelete(null);
    await loadVersions();
  };
  const handleActivate = async (v: AdminVersion) => {
    await supabase.from("admin_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true }).eq("id", v.id);
    await loadVersions();
  };

  // ---------- Header ----------
  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description: "Manage hierarchical administrative units and dataset versions for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admins" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Progress bar */}
      {loadingMsg && (
        <div className="mb-3">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg} {progress ? `${progress}%` : ""}</p>
        </div>
      )}

      {/* Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>
        <table className="w-full text-sm border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Year</th>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Status</th>
              <th className="px-2 py-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}>
                <td
                  className={`border px-2 py-1 cursor-pointer`}
                  onClick={() => setSelectedVersion(v)}
                  title="Show units for this version"
                >
                  {v.title}
                </td>
                <td className="border px-2 py-1">{v.year ?? "—"}</td>
                <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                <td className="border px-2 py-1">{v.source ?? "—"}</td>
                <td className="border px-2 py-1">
                  {v.is_active ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="border px-2 py-1">
                  <div className="flex justify-end gap-3">
                    {!v.is_active && (
                      <button className="text-blue-600 hover:underline text-xs" onClick={() => handleActivate(v)}>
                        Set Active
                      </button>
                    )}
                    <button
                      className="text-gray-700 hover:underline text-xs flex items-center"
                      onClick={() => setEditingVersion(v)}
                      title="Edit version metadata"
                    >
                      <Edit3 className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                      onClick={() => setOpenDelete(v)}
                      title="Delete version & units"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Level toggles + Health */}
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <div className="text-sm font-medium mb-1">Admin Levels</div>
          <div className="flex items-center gap-3">
            {[1,2,3,4,5].map((l) => (
              <label key={l} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(l)}
                  onChange={() => toggleLevel(l)}
                />{" "}
                ADM{l}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={totalUnits} />
      </div>

      {/* Administrative Units */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
          </h2>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-sm border rounded ${viewMode === "table" ? "bg-blue-50 border-blue-400" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Table
            </button>
            <button
              className={`px-3 py-1 text-sm border rounded ${viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""}`}
              onClick={() => setViewMode("tree")}
            >
              Tree
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {normLevels.map((l) => (
                    <th key={l} className="px-2 py-1 text-left">ADM{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {normLevels.map((l) => (
                      <td key={l} className="px-2 py-1">{r[`ADM${l}`]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-lg p-3 bg-white shadow-sm text-sm italic text-gray-500">
            Tree prototype TBD.
          </div>
        )}
      </div>

      {/* Upload */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={loadVersions}
        />
      )}

      {/* Delete */}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove the version "${openDelete.title}" and all related admin units. This cannot be undone.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete)}
        />
      )}
    </SidebarLayout>
  );
}
