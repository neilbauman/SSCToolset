"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers,
  Database,
  Upload,
  Download,
  Edit3,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
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
  path_uid: string[];
};

type TreeNode = Snapshot & { children: TreeNode[] };

// ---------- Helper: Build Tree ----------
function buildTree(records: Snapshot[]): TreeNode[] {
  const map: Record<string, TreeNode> = {};
  const roots: TreeNode[] = [];
  for (const rec of records) map[rec.place_uid] = { ...rec, children: [] };
  for (const rec of records) {
    if (rec.parent_uid && map[rec.parent_uid])
      map[rec.parent_uid].children.push(map[rec.place_uid]);
    else roots.push(map[rec.place_uid]);
  }
  return roots.sort((a, b) => a.pcode.localeCompare(b.pcode));
}

// ---------- Helper: Flatten for table ----------
function flattenTree(
  nodes: TreeNode[],
  row: (string | null)[] = [],
  result: string[][] = [],
  maxLevel = 5
): string[][] {
  for (const node of nodes) {
    const newRow = [...row];
    newRow[node.level - 1] = node.name;
    if (node.children.length) flattenTree(node.children, newRow, result, maxLevel);
    else result.push(newRow);
  }
  return result;
}

// ---------- Component ----------
export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [levelToggles, setLevelToggles] = useState([true, true, true, false, false]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const isFetching = useRef(false);

  // ---------- Fetch country ----------
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data as Country));
  }, [countryIso]);

  // ---------- Fetch dataset versions ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      const list = data ?? [];
      setVersions(list);
      const active = list.find((v) => v.is_active);
      setSelectedVersion(active || list[0] || null);
    })();
  }, [countryIso]);

  // ---------- Fetch snapshots via Edge Function ----------
  useEffect(() => {
    if (!selectedVersion || isFetching.current) return;
    isFetching.current = true;
    setLoadingMsg("Loading snapshots...");
    setProgress(10);

    fetch("https://ergsggprgtlsrrsmwtkf.supabase.co/functions/v1/fetch_snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: selectedVersion.id }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setSnapshots(data);
        setProgress(100);
        setLoadingMsg("");
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoadingMsg("Failed to load units.");
      })
      .finally(() => (isFetching.current = false));
  }, [selectedVersion]);

  // ---------- Handle Version Actions ----------
  const handleActivateVersion = async (v: AdminVersion) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", v.id);
    const { data } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    setVersions(data || []);
    setSelectedVersion(v);
  };

  const handleDeleteVersion = async (id: string) => {
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    const { data } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso);
    setVersions(data || []);
  };

  // ---------- Derived structures ----------
  const roots = buildTree(snapshots);
  const rows = flattenTree(roots);
  const totalUnits = snapshots.length;

  // ---------- Render ----------
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Progress bar */}
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
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
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}
                >
                  <td
                    className="border px-2 py-1 cursor-pointer"
                    onClick={() => setSelectedVersion(v)}
                  >
                    {v.title}
                  </td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">{v.source ?? "—"}</td>
                  <td className="border px-2 py-1">
                    {v.is_active && (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      {!v.is_active && (
                        <button
                          onClick={() => handleActivateVersion(v)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        className="text-gray-600 hover:underline text-xs flex items-center"
                        onClick={() => setOpenDelete(v)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No dataset versions found.</p>
        )}
      </div>

      {/* Toggles + Health */}
      <div className="flex justify-between items-start mb-3">
        <div className="border rounded-lg p-3 bg-white">
          <p className="text-sm font-medium mb-2">Admin Levels</p>
          <div className="flex gap-3">
            {["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l, i) => (
              <label key={l} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={levelToggles[i]}
                  onChange={() =>
                    setLevelToggles((prev) =>
                      prev.map((x, j) => (j === i ? !x : x))
                    )
                  }
                />
                {l}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={totalUnits} />
      </div>

      {/* Table/Tree toggle */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
        </h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 text-sm border rounded ${
              viewMode === "table" ? "bg-blue-50 border-blue-400" : ""
            }`}
            onClick={() => setViewMode("table")}
          >
            Table
          </button>
          <button
            className={`px-3 py-1 text-sm border rounded ${
              viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""
            }`}
            onClick={() => setViewMode("tree")}
          >
            Tree
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"]
                  .filter((_, i) => levelToggles[i])
                  .map((lvl) => (
                    <th key={lvl} className="px-2 py-1 text-left">
                      {lvl}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r
                    .filter((_, j) => levelToggles[j])
                    .map((val, j) => (
                      <td key={j} className="border px-2 py-1">
                        {val ?? "—"}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="italic text-gray-500">Tree prototype coming soon.</div>
      )}

      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={() => window.location.reload()}
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
    </SidebarLayout>
  );
}
