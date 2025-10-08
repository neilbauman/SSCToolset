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

type Country = { iso_code: string; name: string };
type AdminVersion = {
  id: string; country_iso: string | null; title: string;
  year: number | null; dataset_date: string | null; source: string | null;
  is_active: boolean; created_at: string; notes: string | null;
};
type Snapshot = {
  place_uid: string; parent_uid: string | null; name: string; pcode: string;
  level: number; depth: number; path_uid: string[] | null;
};

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1]);

  // ---- Country ----
  useEffect(() => {
    supabase.from("countries").select("iso_code,name")
      .eq("iso_code", countryIso).maybeSingle().then(({ data }) => {
        if (data) setCountry(data as Country);
      });
  }, [countryIso]);

  // ---- Versions ----
  const loadVersions = async () => {
    const { data } = await supabase.from("admin_dataset_versions")
      .select("*").eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (data) {
      setVersions(data);
      const active = data.find(v => v.is_active);
      setSelectedVersion(active || data[0] || null);
    }
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  // ---- Fetch Snapshots ----
  useEffect(() => {
    const fetchSnapshots = async () => {
      if (!selectedVersion) return;
      setLoading(true); setProgress(0);
      try {
        const { count } = await supabase
          .from("place_snapshots")
          .select("*", { count: "exact", head: true })
          .eq("dataset_version_id", selectedVersion.id);
        setTotalUnits(count || 0);
        const { data, error } = await supabase
          .from("place_snapshots")
          .select("place_uid,parent_uid,name,pcode,level,depth,path_uid")
          .eq("dataset_version_id", selectedVersion.id)
          .in("depth", selectedLevels)
          .order("path_uid")
          .limit(20000);
        if (error) throw error;
        setSnapshots(data || []);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); setProgress(100); }
    };
    fetchSnapshots();
  }, [selectedVersion, selectedLevels]);

  // ---- Level Toggle ----
  const toggleLevel = (lvl: number) => {
    setSelectedLevels(prev =>
      prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl].sort());
  };

  // ---- Build Rows for Table ----
  const tableRows = useMemo(() => {
    if (!snapshots.length) return [];
    // Build map to trace hierarchy quickly
    const byUid = new Map(snapshots.map(s => [s.place_uid, s]));
    const rows: { [key: string]: string }[] = [];
    for (const s of snapshots) {
      const chain: Snapshot[] = [];
      let cur: Snapshot | undefined = s;
      while (cur) {
        chain.unshift(cur);
        cur = cur.parent_uid ? byUid.get(cur.parent_uid) : undefined;
      }
      // Only include requested levels
      const row: any = {};
      chain.forEach(c => {
        if (selectedLevels.includes(c.depth))
          row[`ADM${c.depth}`] = c.name;
      });
      rows.push(row);
    }
    return rows;
  }, [snapshots, selectedLevels]);

  // ---- Handle Delete ----
  const handleDeleteVersion = async (v: AdminVersion) => {
    await supabase.from("place_snapshots").delete().eq("dataset_version_id", v.id);
    await supabase.from("admin_units").delete().eq("dataset_version_id", v.id);
    await supabase.from("admin_dataset_versions").delete().eq("id", v.id);
    setOpenDelete(null);
    loadVersions();
  };

  // ---- Activate ----
  const handleActivate = async (v: AdminVersion) => {
    await supabase.from("admin_dataset_versions").update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true })
      .eq("id", v.id);
    loadVersions();
  };

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description: "Manage hierarchical administrative units and dataset versions.",
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

  // ---- Render ----
  return (
    <SidebarLayout headerProps={headerProps}>
      {loading && (
        <div className="mb-3 h-1.5 bg-gray-200 rounded">
          <div className="h-1.5 bg-[color:var(--gsc-red)] rounded"
               style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setOpenUpload(true)}
              className="text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded flex items-center gap-1">
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>
        </div>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th>Year</th><th>Date</th><th>Source</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {versions.map(v => (
              <tr key={v.id} className={`${v.is_active ? "bg-green-50" : ""}`}>
                <td className="px-2 py-1 cursor-pointer"
                    onClick={() => setSelectedVersion(v)}>{v.title}</td>
                <td>{v.year ?? "—"}</td><td>{v.dataset_date ?? "—"}</td>
                <td>{v.source ?? "—"}</td>
                <td>{v.is_active ? <span className="text-green-700 flex gap-1 items-center">
                  <CheckCircle2 className="w-4 h-4" /> Active</span> : "—"}</td>
                <td className="text-right space-x-2">
                  {!v.is_active && (
                    <button onClick={() => handleActivate(v)}
                      className="text-blue-600 text-xs">Set Active</button>)}
                  <button onClick={() => setEditingVersion(v)}
                    className="text-xs flex items-center text-gray-700"><Edit3 className="w-4 h-4 mr-1" />Edit</button>
                  <button onClick={() => setOpenDelete(v)}
                    className="text-xs flex items-center text-[color:var(--gsc-red)]"><Trash2 className="w-4 h-4 mr-1" />Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Level Toggles + Health */}
      <div className="flex justify-between mb-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white flex items-center gap-2">
          <strong className="text-sm mr-2">Admin Levels:</strong>
          {[1,2,3,4,5].map(l => (
            <label key={l} className="flex items-center gap-1 text-sm">
              <input type="checkbox"
                     checked={selectedLevels.includes(l)}
                     onChange={() => toggleLevel(l)} /> ADM{l}
            </label>
          ))}
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
            <button className={`px-3 py-1 text-sm border rounded ${viewMode === "table" ? "bg-blue-50 border-blue-400" : ""}`}
              onClick={() => setViewMode("table")}>Table</button>
            <button className={`px-3 py-1 text-sm border rounded ${viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""}`}
              onClick={() => setViewMode("tree")}>Tree</button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>{selectedLevels.map(l =>
                  <th key={l} className="px-2 py-1 text-left">ADM{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {selectedLevels.map(l => (
                      <td key={l} className="px-2 py-1">{r[`ADM${l}`] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="italic text-gray-500">Tree view prototype TBD.</div>
        )}
      </div>

      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload} onClose={() => setOpenUpload(false)}
          countryIso={countryIso} onUploaded={loadVersions} />
      )}
      {openDelete && (
        <ConfirmDeleteModal open={!!openDelete}
          message={`Delete version "${openDelete.title}" and all related units?`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete)} />
      )}
    </SidebarLayout>
  );
}
