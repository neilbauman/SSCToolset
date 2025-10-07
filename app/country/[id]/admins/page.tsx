"use client";
import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers, Database, Upload, Edit3, Trash2, CheckCircle2,
  Download, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import EditAdminDatasetVersionModal from "@/components/country/EditAdminDatasetVersionModal";
import type { CountryParams } from "@/app/country/types";

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState("tree");
  const [expanded, setExpanded] = useState(new Set<string>());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [fadeOut, setFadeOut] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<any>(null);
  const [editingVersion, setEditingVersion] = useState<any>(null);

  useEffect(() => {
    supabase.from("countries").select("*").eq("iso_code", countryIso)
      .single().then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  const loadVersions = async () => {
    const { data } = await supabase.from("admin_dataset_versions")
      .select("*").eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!data) return;
    setVersions(data);
    setSelectedVersion(data.find(v => v.is_active) || data[0] || null);
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  const fetchAllUnits = async (versionId: string) => {
    const limit = 2000; let from = 0; let to = limit - 1; let all: any[] = [];
    setLoading(true); setFadeOut(false); setProgress({ loaded: 0, total: 0 });
    const { count } = await supabase.from("admin_units")
      .select("*", { head: true, count: "exact" })
      .eq("dataset_version_id", versionId);
    setProgress({ loaded: 0, total: count || 0 });
    while (true) {
      const { data } = await supabase.from("admin_units")
        .select("id,pcode,name,level,parent_pcode")
        .eq("dataset_version_id", versionId).range(from, to);
      if (!data?.length) break;
      all = [...all, ...data];
      setProgress(p => ({ ...p, loaded: all.length }));
      if (data.length < limit) break;
      from += limit; to += limit;
      await new Promise(r => setTimeout(r, 60));
    }
    setUnits(all);
    setTimeout(() => setFadeOut(true), 1200);
    setTimeout(() => setLoading(false), 2200);
  };
  useEffect(() => { if (selectedVersion) fetchAllUnits(selectedVersion.id); }, [selectedVersion]);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };
  const buildTree = (rows: any[]) => {
    const map: any = {}, roots: any[] = [];
    rows.forEach(r => (map[r.pcode] = { ...r, children: [] }));
    rows.forEach(r => (r.parent_pcode && map[r.parent_pcode])
      ? map[r.parent_pcode].children.push(map[r.pcode]) : roots.push(map[r.pcode]));
    return roots;
  };
  const renderTree = (n: any, d = 0) => (
    <div key={n.pcode} style={{ marginLeft: d * 16 }}>
      <div className="flex items-center gap-1">
        {n.children.length ? (
          <button onClick={() => toggleExpand(n.pcode)}>
            {expanded.has(n.pcode) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : <span className="w-4 h-4" />}
        <span className="font-medium">{n.name}</span>
        <span className="text-gray-400 text-xs ml-1">{n.pcode}</span>
      </div>
      {expanded.has(n.pcode) && n.children.map((c: any) => renderTree(c, d + 1))}
    </div>
  );

  const downloadTemplate = () => {
    const headers = ["ADM1 Name","ADM1 PCode","ADM2 Name","ADM2 PCode","ADM3 Name","ADM3 PCode","ADM4 Name","ADM4 PCode","ADM5 Name","ADM5 PCode"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "admin_units_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const renderSource = (src: string | null) => {
    if (!src) return "—";
    try {
      const s = JSON.parse(src);
      return s.url ? (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {s.name || s.url}
        </a>
      ) : s.name || "—";
    } catch { return src; }
  };

  const activate = async (v: any) => {
    await supabase.from("admin_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true }).eq("id", v.id);
    loadVersions();
  };
  const delVersion = async (id: string) => {
    await supabase.from("admin_units").delete().eq("dataset_version_id", id);
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    setOpenDelete(null); loadVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config",
    description: "Manage administrative units and dataset versions.",
    breadcrumbs: <Breadcrumbs items={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Country Configuration", href: "/country" },
      { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
      { label: "Admins" },
    ]} />,
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50">
              <Download className="w-4 h-4 mr-1" /> Template
            </button>
            <button onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90">
              <Upload className="w-4 h-4 mr-1" /> Upload
            </button>
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100"><tr>
              <th>Title</th><th>Year</th><th>Date</th><th>Source</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>{versions.map(v => (
              <tr key={v.id} className={`hover:bg-gray-50 ${selectedVersion?.id===v.id?"bg-blue-50":""}`}>
                <td onClick={() => setSelectedVersion(v)} className="border px-2 py-1 cursor-pointer">{v.title}</td>
                <td>{v.year ?? "—"}</td><td>{v.dataset_date ?? "—"}</td>
                <td>{renderSource(v.source)}</td>
                <td>{v.is_active ? <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Active</span>:"—"}</td>
                <td className="text-right flex justify-end gap-2">
                  {!v.is_active && <button onClick={()=>activate(v)} className="text-blue-600 text-xs hover:underline">Set Active</button>}
                  <button onClick={()=>setEditingVersion(v)} className="text-gray-600 text-xs hover:underline"><Edit3 className="w-4 h-4 inline"/> Edit</button>
                  <button onClick={()=>setOpenDelete(v)} className="text-[color:var(--gsc-red)] text-xs hover:underline"><Trash2 className="w-4 h-4 inline"/> Delete</button>
                </td>
              </tr>))}</tbody>
          </table>
        ) : <p className="italic text-gray-500">No dataset versions uploaded yet.</p>}
      </div>

      <DatasetHealth totalUnits={units.length} />

      {/* Progress Indicator */}
      {(loading || fadeOut) && (
        <div className={`transition-opacity duration-1000 ${fadeOut ? "opacity-0" : "opacity-100"} mb-3`}>
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Loading {progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} (
              {progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded">
            <div className="h-2 bg-blue-500 rounded transition-all duration-500"
              style={{ width: `${progress.total ? (progress.loaded / progress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Table / Tree */}
      <div className="flex justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
        </h2>
        <div className="flex gap-2">
          {["table", "tree"].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1 text-sm border rounded ${viewMode===m?"bg-blue-50 border-blue-400":""}`}>
              {m[0].toUpperCase()+m.slice(1)} View
            </button>
          ))}
        </div>
      </div>

      {viewMode==="tree"
        ? <div className="border rounded-lg p-3 bg-white shadow-sm overflow-y-auto max-h-[70vh]">
            {buildTree(units).map(n => renderTree(n))}
          </div>
        : <div className="overflow-x-auto max-h-[70vh] border rounded-lg">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100 sticky top-0"><tr><th>Name</th><th>PCode</th><th>Level</th><th>Parent</th></tr></thead>
              <tbody>{units.map(u=>(
                <tr key={u.id} className="hover:bg-gray-50">
                  <td>{u.name}</td><td>{u.pcode}</td><td>{u.level}</td><td>{u.parent_pcode??"—"}</td>
                </tr>))}</tbody>
            </table>
          </div>}

      {/* Modals */}
      {openUpload && <UploadAdminUnitsModal open onClose={()=>setOpenUpload(false)} countryIso={countryIso} onUploaded={loadVersions}/>}
      {openDelete && <ConfirmDeleteModal open message={`Remove "${openDelete.title}" and its records?`} onClose={()=>setOpenDelete(null)} onConfirm={()=>delVersion(openDelete.id)} />}
      {editingVersion && <EditAdminDatasetVersionModal open onClose={()=>setEditingVersion(null)} versionId={editingVersion.id} onSaved={loadVersions}/>}
    </SidebarLayout>
  );
}
