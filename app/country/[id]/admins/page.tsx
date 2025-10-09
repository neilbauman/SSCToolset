"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers, Database, Upload, CheckCircle2, Trash2, Edit3, Download, Search, Loader2,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type AdminVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};
type AdminUnit = { place_uid: string; name: string; pcode: string; level: string; parent_uid?: string | null };

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [versionStats, setVersionStats] = useState<Record<string, { total: number; lowest: string }>>({});
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);
  const [admToggles, setAdmToggles] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const [searchTerm, setSearchTerm] = useState("");
  const isFetchingRef = useRef(false);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedLevels = useMemo(
    () => Object.entries(admToggles).filter(([_, v]) => v).map(([k]) => Number(k)),
    [admToggles]
  );

  // Load country
  useEffect(() => {
    supabase.from("countries").select("iso_code,name").eq("iso_code", countryIso).maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  // Load versions
  const loadVersions = async () => {
    const { data } = await supabase.from("admin_dataset_versions")
      .select("*").eq("country_iso", countryIso).order("created_at", { ascending: false });
    if (!data) return;
    setVersions(data);
    const active = data.find(v => v.is_active) || data[0] || null;
    setSelectedVersion(active);

    // Fetch stats (total + lowest level)
    const stats: Record<string, { total: number; lowest: string }> = {};
    for (const v of data) {
      const { count } = await supabase
        .from("admin_units")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", v.id);
      const { data: lvls } = await supabase
        .from("admin_units")
        .select("level")
        .eq("dataset_version_id", v.id);
      const levels = lvls?.map(l => l.level.replace("ADM", "")).map(Number) || [];
      const lowest = levels.length ? `ADM${Math.max(...levels)}` : "—";
      stats[v.id] = { total: count ?? 0, lowest };
    }
    setVersionStats(stats);
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  // Fetch units from Edge Function
  useEffect(() => {
    if (!selectedVersion || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMsg("Loading administrative units...");
    setProgress(10);
    progressTimer.current = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 200);

    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch_snapshots`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: selectedVersion.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setUnits(data);
          setTotalUnits(data.length);
        } else if (data?.sample) {
          setUnits(data.sample);
          setTotalUnits(data.total_rows ?? data.sample.length);
        } else {
          setUnits([]);
          setTotalUnits(0);
        }
        setProgress(100);
        setLoadingMsg("");
      })
      .catch(() => setLoadingMsg("Failed to load data."))
      .finally(() => {
        isFetchingRef.current = false;
        if (progressTimer.current) clearInterval(progressTimer.current);
      });
  }, [selectedVersion]);

  // Delete / Edit / Activate
  const handleDeleteVersion = async (id: string) => {
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const handleSaveEdit = async (partial: Partial<AdminVersion>) => {
    if (!editingVersion) return;
    await supabase.from("admin_dataset_versions").update(partial).eq("id", editingVersion.id);
    setEditingVersion(null);
    await loadVersions();
  };

  const handleActivateVersion = async (v: AdminVersion) => {
    await supabase.from("admin_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true }).eq("id", v.id);
    await loadVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description: "Manage hierarchical administrative units and dataset versions for this country.",
    breadcrumbs: (
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Country Configuration", href: "/country" },
        { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
        { label: "Admins" },
      ]} />
    ),
  };

  const filteredUnits = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return units;
    return units.filter(u =>
      u.name.toLowerCase().includes(term) || u.pcode.toLowerCase().includes(term)
    );
  }, [units, searchTerm]);

  const templateUrl =
    "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/admin_units_template.csv";

  // ---- Render ----
  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      {/* Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <a href={templateUrl} download className="flex items-center text-sm border px-3 py-1 rounded hover:bg-blue-50 text-blue-700">
              <Download className="w-4 h-4 mr-1" /> Template
            </a>
            <button onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90">
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th>Year</th>
                <th>Date</th>
                <th>Source</th>
                <th>Records</th>
                <th>Lowest Admin</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => {
                const stats = versionStats[v.id] || { total: 0, lowest: "…" };
                let src: JSX.Element = <span>—</span>;
                if (v.source) {
                  try {
                    const s = JSON.parse(v.source);
                    src = s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{s.name || s.url}</a>
                    ) : <span>{s.name}</span>;
                  } catch { src = <span>{v.source}</span>; }
                }
                const isSelected = selectedVersion?.id === v.id;
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}>
                    <td
                      onClick={() => setSelectedVersion(v)}
                      className={`border px-2 py-1 cursor-pointer ${isSelected ? "font-bold" : ""}`}
                    >
                      {v.title}
                    </td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                    <td className="border px-2 py-1">{src}</td>
                    <td className="border px-2 py-1 text-center">{stats.total}</td>
                    <td className="border px-2 py-1 text-center">{stats.lowest}</td>
                    <td className="border px-2 py-1 text-center">
                      {v.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </span>
                      ) : "—"}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      <div className="flex justify-end gap-2">
                        {!v.is_active && (
                          <button
                            className="text-blue-600 hover:underline text-xs"
                            onClick={() => handleActivateVersion(v)}
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          className="text-gray-700 hover:underline text-xs flex items-center"
                          onClick={() => setEditingVersion(v)}
                        >
                          <Edit3 className="w-4 h-4 mr-1" /> Edit
                        </button>
                        <button
                          className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                          onClick={() => setOpenDelete(v)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (<p className="italic text-gray-500 text-sm">No dataset versions uploaded yet.</p>)}
      </div>

      {/* Active Version Title */}
      <h2 className="text-xl font-bold text-[color:var(--gsc-red)] mb-2">
        {selectedVersion ? selectedVersion.title : "No Version Selected"}
      </h2>

      {/* Controls */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <h3 className="text-sm font-semibold mb-2">Admin Levels</h3>
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3, 4, 5].map(lvl => (
              <label key={lvl} className="flex items-center gap-1 text-sm">
                <input type="checkbox"
                  checked={admToggles[lvl as 1 | 2 | 3 | 4 | 5]}
                  onChange={() => setAdmToggles(p => ({ ...p, [lvl]: !p[lvl as 1 | 2 | 3 | 4 | 5] }))} />
                ADM{lvl}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={totalUnits} />
      </div>

      {/* Search */}
      <div className="flex items-center mb-3 border rounded-lg px-2 py-1 w-full max-w-md bg-white">
        <Search className="w-4 h-4 text-gray-500 mr-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name or PCode..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>

      {/* Tree */}
      <AdminUnitsTree units={filteredUnits} activeLevels={selectedLevels} />

      {/* Modals */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={loadVersions}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove version "${openDelete.title}".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}
      {editingVersion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Edit Version</h3>
            <div className="space-y-2 text-sm">
              <label className="block">Title
                <input type="text" value={editingVersion.title}
                  onChange={(e) => setEditingVersion({ ...editingVersion, title: e.target.value })}
                  className="border rounded w-full px-2 py-1 mt-1" />
              </label>
              <label className="block">Year
                <input type="number" value={editingVersion.year ?? ""}
                  onChange={(e) => setEditingVersion({ ...editingVersion, year: e.target.value ? Number(e.target.value) : null })}
                  className="border rounded w-full px-2 py-1 mt-1" />
              </label>
              <label className="block">Dataset Date
                <input type="date" value={editingVersion.dataset_date ?? ""}
                  onChange={(e) => setEditingVersion({ ...editingVersion, dataset_date: e.target.value || null })}
                  className="border rounded w-full px-2 py-1 mt-1" />
              </label>
              <label className="block">Source Name / URL
                <input type="text" value={editingVersion.source ?? ""}
                  onChange={(e) => setEditingVersion({ ...editingVersion, source: e.target.value || null })}
                  className="border rounded w-full px-2 py-1 mt-1" />
              </label>
              <label className="block">Notes
                <textarea
                  value={(editingVersion as any).notes ?? ""}
                  onChange={(e) => setEditingVersion({ ...editingVersion, notes: e.target.value || null })}
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingVersion(null)} className="px-3 py-1 text-sm border rounded">Cancel</button>
              <button onClick={() => handleSaveEdit(editingVersion)} className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
