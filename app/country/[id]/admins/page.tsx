"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers, Database, Upload, Edit3, Trash2, CheckCircle2
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
  level: number;
  depth: number;
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
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1]);

  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const fetchingRef = useRef(false);

  // ----- Country -----
  useEffect(() => {
    supabase.from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data as Country));
  }, [countryIso]);

  // ----- Versions -----
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

  // ----- Fetch snapshots (paged) -----
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedVersion || fetchingRef.current) return;
      fetchingRef.current = true;
      setSnapshots([]); setProgress(0); setLoadingMsg("");

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
        setLoadingMsg(`Loading ${total.toLocaleString()} records...`);
        const all: Snapshot[] = [];

        for (let i = 0; i < pages; i++) {
          const from = i * pageSize;
          const to = Math.min(from + pageSize - 1, total - 1);
          const { data, error } = await supabase
            .from("place_snapshots")
            .select("place_uid,parent_uid,name,pcode,level,depth,path_uid")
            .eq("dataset_version_id", selectedVersion.id)
            .order("pcode", { ascending: true })
            .range(from, to);
          if (error) throw error;
          all.push(...(data as Snapshot[]));
          setProgress(Math.round(((i + 1) / pages) * 100));
        }
        setSnapshots(all);
        setLoadingMsg("");
      } catch (e) {
        console.error("Fetch error:", e);
        setLoadingMsg("Failed to load data.");
      } finally { fetchingRef.current = false; }
    };
    fetchAll();
  }, [selectedVersion]);

  // ----- Level toggles -----
  const toggleLevel = (lvl: number) => {
    setSelectedLevels((prev) => {
      const s = new Set(prev);
      if (s.has(lvl)) for (let i = lvl; i <= 5; i++) s.delete(i);
      else for (let i = 1; i <= lvl; i++) s.add(i);
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const normLevels = useMemo(() => {
    if (selectedLevels.length === 0) return [1];
    const max = Math.max(...selectedLevels);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [selectedLevels]);

  const targetDepth = useMemo(() => Math.max(...normLevels), [normLevels]);

  const byUid = useMemo(() => {
    const m = new Map<string, Snapshot>();
    snapshots.forEach((s) => m.set(s.place_uid, s));
    return m;
  }, [snapshots]);

  // ----- Table rows -----
  const tableRows = useMemo(() => {
    if (!snapshots.length) return [];

    // ✅ Fixed logic: ADM1 should show all roots (no parent)
    const deepest =
      targetDepth === 1
        ? snapshots.filter((s) => !s.parent_uid)
        : snapshots.filter((s) => s.depth === targetDepth);

    deepest.sort((a, b) => a.pcode.localeCompare(b.pcode));

    return deepest.map((leaf) => {
      const row: Record<string, string> = {};
      let cur: Snapshot | undefined = leaf;
      while (cur) {
        if (normLevels.includes(cur.depth)) row[`ADM${cur.depth}`] = cur.name;
        cur = cur.parent_uid ? byUid.get(cur.parent_uid) : undefined;
      }
      normLevels.forEach((lvl) => {
        if (!row[`ADM${lvl}`]) row[`ADM${lvl}`] = "—";
      });
      return row;
    });
  }, [snapshots, targetDepth, normLevels, byUid]);

  // ----- Delete / Activate -----
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
      {loadingMsg && (
        <div className="mb-3">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg} {progress}%</p>
        </div>
      )}

      {/* Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th>Year</th><th>Date</th><th>Source</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className={`${v.is_active ? "bg-green-50" : ""}`}>
                <td className="px-2 py-1 cursor-pointer" onClick={() => setSelectedVersion(v)}>{v.title}</td>
                <td>{v.year ?? "—"}</td><td>{v.dataset_date ?? "—"}</td>
                <td>{v.source ?? "—"}</td>
                <td>{v.is_active ? <span className="text-green-700 flex gap-1 items-center"><CheckCircle2 className="w-4 h-4" />Active</span> : "—"}</td>
                <td className="text-right space-x-2">
                  {!v.is_active && <button onClick={() => handleActivate(v)} className="text-blue-600 text-xs">Set Active</button>}
                  <button onClick={() => setEditingVersion(v)} className="text-xs text-gray-700"><Edit3 className="w-4 h-4 inline mr-1" />Edit</button>
                  <button onClick={() => setOpenDelete(v)} className="text-xs text-[color:var(--gsc-red)]"><Trash2 className="w-4 h-4 inline mr-1" />Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Level toggles + Health */}
      <div className="flex justify-between mb-3 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <div className="text-sm font-medium mb-1">Admin Levels</div>
          <div className="flex items-center gap-3">
            {[1,2,3,4,5].map((l) => (
              <label key={l} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={selectedLevels.includes(l)} onChange={() => toggleLevel(l)} /> ADM{l}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={totalUnits} />
      </div>

      {/* Admin Units */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
          </h2>
          <div className="flex gap-2">
            <button className={`px-3 py-1 text-sm border rounded ${viewMode === "table" ? "bg-blue-50 border-blue-400" : ""}`} onClick={() => setViewMode("table")}>Table</button>
            <button className={`px-3 py-1 text-sm border rounded ${viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""}`} onClick={() => setViewMode("tree")}>Tree</button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>{normLevels.map((l) => <th key={l} className="px-2 py-1 text-left">ADM{l}</th>)}</tr>
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
          <div className="text-gray-500 italic text-sm">Tree view prototype TBD.</div>
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
          message={`Delete version "${openDelete.title}" and all related data?`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete)}
        />
      )}
    </SidebarLayout>
  );
}
