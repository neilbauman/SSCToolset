"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers,
  Database,
  Upload,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  CheckCircle2,
  Download,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

// ---------- Types ----------
type Country = { iso_code: string; name: string };

type AdminVersion = {
  id: string;
  country_iso: string | null;
  title: string;
  year: number | null;
  dataset_date: string | null; // DATE in DB
  source: string | null;       // name or url, or JSON string {name,url}
  is_active: boolean;
  created_at: string;
  notes: string | null;
};

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string; // "ADM1".."ADM5"
  parent_pcode: string | null;
};

type TreeNode = AdminUnit & { children: TreeNode[] };

// ---------- Helpers ----------
const SOURCE_CELL = ({ value }: { value: string | null }) => {
  if (!value) return <span>—</span>;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && parsed.name) {
      const { name, url } = parsed as { name: string; url?: string };
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
          {name}
        </a>
      ) : (
        <span>{name}</span>
      );
    }
  } catch {
    /* fall through if not JSON */
  }
  return <span>{value.trim()}</span>;
};

// Build parent/child tree then sort siblings by PCode
const buildTree = (rows: AdminUnit[]): TreeNode[] => {
  if (!rows.length) return [];
  const map: Record<string, TreeNode> = {};
  for (const r of rows) map[r.pcode] = { ...r, children: [] };

  const roots: TreeNode[] = [];
  for (const r of rows) {
    if (r.parent_pcode && map[r.parent_pcode]) {
      map[r.parent_pcode].children.push(map[r.pcode]);
    } else {
      roots.push(map[r.pcode]);
    }
  }

  const sortByPCode = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.pcode.localeCompare(b.pcode));
    nodes.forEach((n) => sortByPCode(n.children));
  };
  sortByPCode(roots);
  return roots;
};

// Flatten the hierarchy: one row per full path (leaf) with ADM1..ADM5 columns
type Row = Record<string, string>; // { ADM1: "X", ADM2: "Y", ... }
const flattenHierarchy = (nodes: TreeNode[]): Row[] => {
  const out: Row[] = [];
  const dfs = (node: TreeNode, path: Row) => {
    const next = { ...path, [node.level]: node.name };
    if (node.children.length) {
      node.children.forEach((c) => dfs(c, next));
    } else {
      out.push(next);
    }
  };
  nodes.forEach((n) => dfs(n, {}));
  return out;
};

// Wide CSV template (ADM1–ADM5)
const downloadWideTemplate = () => {
  const header = [
    "ADM1 Name","ADM1 PCode",
    "ADM2 Name","ADM2 PCode",
    "ADM3 Name","ADM3 PCode",
    "ADM4 Name","ADM4 PCode",
    "ADM5 Name","ADM5 PCode",
  ].join(",");
  const blob = new Blob([`${header}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "admin_units_template_ADM1-ADM5.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ---------- Page ----------
export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);

  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [totalUnits, setTotalUnits] = useState<number>(0);

  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  // Progress UI for large fetches
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const isFetchingRef = useRef(false);

  // Admin level toggles (auto-include parents)
  const allLevels = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["ADM1"]);
  const toggleLevel = (lvl: string) => {
    const idx = allLevels.indexOf(lvl);
    setSelectedLevels((prev) =>
      prev.includes(lvl) ? allLevels.slice(0, idx) : allLevels.slice(0, idx + 1)
    );
  };

  // ----- Fetch country -----
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

  // ----- Load versions -----
  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin versions:", error);
      return;
    }

    const list = data ?? [];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  // ----- Fetch units (paged, >1000) -----
  useEffect(() => {
    const fetchAll = async () => {
      setUnits([]);
      setTotalUnits(0);
      setProgress(0);
      setLoadingMsg("");

      if (!selectedVersion) return;
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const head = await supabase
          .from("admin_units")
          .select("id", { count: "exact", head: true })
          .eq("dataset_version_id", selectedVersion.id);

        const total = head.count ?? 0;
        setTotalUnits(total);

        if (total === 0) {
          setLoadingMsg("");
          setProgress(100);
          return;
        }

        const pageSize = 5000;
        const pages = Math.ceil(total / pageSize);
        setLoadingMsg(`Loading ${total.toLocaleString()} records...`);

        const all: AdminUnit[] = [];
        for (let i = 0; i < pages; i++) {
          const from = i * pageSize;
          const to = Math.min(from + pageSize - 1, total - 1);
          const { data, error } = await supabase
            .from("admin_units")
            .select("id,pcode,name,level,parent_pcode")
            .eq("dataset_version_id", selectedVersion.id)
            .order("pcode", { ascending: true })
            .range(from, to);
          if (error) throw error;

          all.push(...((data as AdminUnit[]) ?? []));
          setProgress(Math.round(((i + 1) / pages) * 100));
        }

        setUnits(all);
        setLoadingMsg("");
      } catch (err) {
        console.error("Error fetching units:", err);
        setLoadingMsg("Failed to load records.");
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchAll();
  }, [selectedVersion]);

  // ---------- Tree & table data ----------
  const treeData = useMemo(() => buildTree(units), [units]);

  // Limit depth for tree view by selectedLevels (ADM1..N)
  const limitedTree = useMemo(() => {
    const maxDepth = selectedLevels.length; // 1..5
    const limit = (nodes: TreeNode[], depth = 1): TreeNode[] =>
      depth > maxDepth
        ? []
        : nodes.map((n) => ({ ...n, children: limit(n.children, depth + 1) }));
    return limit(treeData);
  }, [treeData, selectedLevels]);

  // Flatten to rows for table; include only selected level columns
  const flatRows = useMemo(() => {
    const rows = flattenHierarchy(treeData);
    // Fill ragged paths and keep only selected columns
    return rows.map((r) => {
      const out: Row = {};
      selectedLevels.forEach((lvl) => (out[lvl] = r[lvl] ?? "—"));
      return out;
    });
  }, [treeData, selectedLevels]);

  // ----- Delete version (and units) -----
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const { data: unitIds } = await supabase
        .from("admin_units")
        .select("id")
        .eq("dataset_version_id", versionId);
      const ids = (unitIds ?? []).map((u) => u.id);
      if (ids.length) await supabase.from("admin_units").delete().in("id", ids);
      await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
      setOpenDelete(null);
      await loadVersions();
    } catch (err) {
      console.error("Error deleting version:", err);
    }
  };

  // ----- Activate version -----
  const handleActivateVersion = async (v: AdminVersion) => {
    await supabase.from("admin_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true }).eq("id", v.id);
    await loadVersions();
  };

  // ----- Save edited version (inline modal) -----
  const handleSaveEdit = async (partial: Partial<AdminVersion>) => {
    if (!editingVersion) return;
    await supabase.from("admin_dataset_versions").update(partial).eq("id", editingVersion.id);
    setEditingVersion(null);
    await loadVersions();
  };

  // ----- Header props (keep as-is) -----
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

  // ---------- Render ----------
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Progress bar (top) */}
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

      {/* Dataset Versions (unchanged) */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={downloadWideTemplate}
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" /> Template (ADM1–ADM5)
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length ? (
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
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}
                >
                  <td
                    className={`border px-2 py-1 cursor-pointer ${
                      selectedVersion?.id === v.id ? "font-semibold" : ""
                    }`}
                    onClick={() => setSelectedVersion(v)}
                    title="Show units for this version"
                  >
                    {v.title}
                  </td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">
                    <SOURCE_CELL value={v.source} />
                  </td>
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
        ) : (
          <p className="italic text-gray-500">No dataset versions uploaded yet.</p>
        )}
      </div>

      {/* Admin toggle panel + Dataset Health (side by side) */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <h3 className="font-semibold text-sm mb-2">Admin Levels</h3>
          <div className="flex gap-3 flex-wrap">
            {allLevels.map((lvl) => (
              <label key={lvl} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(lvl)}
                  onChange={() => toggleLevel(lvl)}
                />
                {lvl}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={totalUnits} />
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
        </h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 text-sm border rounded ${viewMode === "table" ? "bg-blue-50 border-blue-400" : ""}`}
            onClick={() => setViewMode("table")}
          >
            Table View
          </button>
          <button
            className={`px-3 py-1 text-sm border rounded ${viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""}`}
            onClick={() => setViewMode("tree")}
          >
            Tree View
          </button>
        </div>
      </div>

      {/* Units */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {selectedLevels.map((lvl) => (
                  <th key={lvl} className="px-2 py-1 text-left">{lvl}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {selectedLevels.map((lvl) => (
                    <td key={lvl} className="px-2 py-1 border">{row[lvl] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!loadingMsg && totalUnits > 0 && units.length < totalUnits && (
            <div className="p-2 text-xs text-gray-500">
              Showing {units.length.toLocaleString()} of {totalUnits.toLocaleString()}…
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-3 bg-white shadow-sm">
          {/* limit depth by selectedLevels; expand/collapse per node */}
          {limitedTree.length ? (
            limitedTree.map((root) => {
              const renderNode = (node: TreeNode, depth = 0): JSX.Element => (
                <div key={node.pcode} style={{ marginLeft: depth * 16 }} className="py-0.5">
                  <div className="flex items-center gap-1">
                    {node.children.length > 0 ? (
                      <button
                        onClick={() => {
                          const next = new Set(expanded);
                          next.has(node.pcode) ? next.delete(node.pcode) : next.add(node.pcode);
                          setExpanded(next);
                        }}
                      >
                        {expanded.has(node.pcode) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                    <span className="font-medium">{node.name}</span>
                    <span className="text-gray-500 text-xs ml-1">{node.pcode}</span>
                  </div>
                  {expanded.has(node.pcode) &&
                    node.children.map((c) => renderNode(c, depth + 1))}
                </div>
              );
              return renderNode(root, 0);
            })
          ) : (
            <p className="italic text-gray-500">No admin units found.</p>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={loadVersions}
        />
      )}

      {/* Delete Confirmation */}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove the version "${openDelete.title}" and all related admin units. This cannot be undone.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}

      {/* Inline Edit Version Modal (unchanged) */}
      {editingVersion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Edit Version</h3>
            <div className="space-y-2">
              <label className="block text-sm">
                Title
                <input
                  type="text"
                  value={editingVersion.title}
                  onChange={(e) => setEditingVersion({ ...editingVersion, title: e.target.value })}
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
              <label className="block text-sm">
                Year
                <input
                  type="number"
                  value={editingVersion.year ?? ""}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      year: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
              <label className="block text-sm">
                Dataset Date
                <input
                  type="date"
                  value={editingVersion.dataset_date ?? ""}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      dataset_date: e.target.value || null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
              <label className="block text-sm">
                Source (name or URL)
                <input
                  type="text"
                  value={editingVersion.source ?? ""}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      source: e.target.value || null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
              <label className="block text-sm">
                Notes
                <textarea
                  value={editingVersion.notes ?? ""}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      notes: e.target.value || null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingVersion(null)} className="px-3 py-1 text-sm border rounded">
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingVersion)}
                className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
