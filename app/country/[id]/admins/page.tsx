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
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
};

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
};

type TreeNode = AdminUnit & { children: TreeNode[] };

// ---------- Helpers ----------
const SOURCE_CELL = ({ value }: { value: string | null }) => {
  if (!value) return <span>—</span>;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && parsed.name) {
      const name = parsed.name;
      const url = parsed.url;
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:underline"
        >
          {name}
        </a>
      ) : (
        <span>{name}</span>
      );
    }
  } catch {}
  return <span>{value}</span>;
};

const buildTree = (rows: AdminUnit[]): TreeNode[] => {
  if (!rows.length) return [];
  const map: Record<string, TreeNode> = {};
  for (const r of rows) map[r.pcode] = { ...r, children: [] };
  const roots: TreeNode[] = [];
  for (const r of rows) {
    if (r.parent_pcode && map[r.parent_pcode])
      map[r.parent_pcode].children.push(map[r.pcode]);
    else roots.push(map[r.pcode]);
  }
  const sortByPCode = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.pcode.localeCompare(b.pcode));
    nodes.forEach((n) => sortByPCode(n.children));
  };
  sortByPCode(roots);
  return roots;
};

const downloadWideTemplate = () => {
  const header = [
    "ADM1 Name",
    "ADM1 PCode",
    "ADM2 Name",
    "ADM2 PCode",
    "ADM3 Name",
    "ADM3 PCode",
    "ADM4 Name",
    "ADM4 PCode",
    "ADM5 Name",
    "ADM5 PCode",
  ].join(",");
  const blob = new Blob([`${header}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "admin_units_template_ADM1-ADM5.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- Page ----------
export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] =
    useState<AdminVersion | null>(null);

  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(
    null
  );

  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const isFetchingRef = useRef(false);

  // --- Level Toggles ---
  const allLevels = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["ADM1"]);

  const toggleLevel = (lvl: string) => {
    const idx = allLevels.indexOf(lvl);
    let next: string[] = [];
    if (selectedLevels.includes(lvl)) {
      // deselect → remove all deeper
      next = allLevels.slice(0, idx);
    } else {
      // select → ensure all parents
      next = allLevels.slice(0, idx + 1);
    }
    setSelectedLevels(next);
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
  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // ----- Fetch units -----
  useEffect(() => {
    const fetchAll = async () => {
      setUnits([]);
      if (!selectedVersion || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const { count } = await supabase
          .from("admin_units")
          .select("id", { count: "exact", head: true })
          .eq("dataset_version_id", selectedVersion.id);
        setTotalUnits(count ?? 0);

        const pageSize = 5000;
        const pages = Math.ceil((count ?? 0) / pageSize);
        const all: AdminUnit[] = [];
        for (let i = 0; i < pages; i++) {
          const from = i * pageSize;
          const to = from + pageSize - 1;
          const { data } = await supabase
            .from("admin_units")
            .select("id,pcode,name,level,parent_pcode")
            .eq("dataset_version_id", selectedVersion.id)
            .order("pcode", { ascending: true })
            .range(from, to);
          all.push(...((data as AdminUnit[]) || []));
          setProgress(Math.round(((i + 1) / pages) * 100));
        }
        setUnits(all);
      } catch (e) {
        console.error("Error fetching units:", e);
      } finally {
        isFetchingRef.current = false;
      }
    };
    fetchAll();
  }, [selectedVersion]);

  // ----- Tree + Flatten helpers -----
  const treeData = useMemo(() => buildTree(units), [units]);

  const flattenTree = (nodes: TreeNode[], depth = 0): any[] => {
    const rows: any[] = [];
    for (const n of nodes) {
      if (!allLevels.includes(n.level)) continue;
      const row: any = { [`${n.level}`]: n.name, [`${n.level}_pcode`]: n.pcode };
      rows.push(row);
      if (n.children?.length) rows.push(...flattenTree(n.children, depth + 1));
    }
    return rows;
  };

  const filteredTree = useMemo(() => {
    // limit tree depth to deepest selected
    const maxDepth = selectedLevels.length;
    const limitDepth = (nodes: TreeNode[], depth = 1): TreeNode[] => {
      if (depth > maxDepth) return [];
      return nodes.map((n) => ({
        ...n,
        children: limitDepth(n.children, depth + 1),
      }));
    };
    return limitDepth(treeData);
  }, [treeData, selectedLevels]);

  // ----- Delete / Activate / Save -----
  const handleDeleteVersion = async (id: string) => {
    await supabase.from("admin_units").delete().eq("dataset_version_id", id);
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const handleActivateVersion = async (v: AdminVersion) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", v.id);
    await loadVersions();
  };

  const handleSaveEdit = async (partial: Partial<AdminVersion>) => {
    if (!editingVersion) return;
    await supabase
      .from("admin_dataset_versions")
      .update(partial)
      .eq("id", editingVersion.id);
    setEditingVersion(null);
    await loadVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description:
      "Manage hierarchical administrative units and dataset versions for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          {
            label: country?.name ?? countryIso,
            href: `/country/${countryIso}`,
          },
          { label: "Admins" },
        ]}
      />
    ),
  };

  // ---------- Render ----------
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top Panel: Admin Toggles + Dataset Health */}
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

      {/* Dataset Versions */}
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
              <Download className="w-4 h-4 mr-1" /> Template
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
                  className={`hover:bg-gray-50 ${
                    v.is_active ? "bg-green-50" : ""
                  }`}
                >
                  <td
                    className="border px-2 py-1 cursor-pointer"
                    onClick={() => setSelectedVersion(v)}
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
                        className="text-gray-600 hover:underline text-xs"
                        onClick={() => setEditingVersion(v)}
                      >
                        <Edit3 className="inline w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs"
                        onClick={() => setOpenDelete(v)}
                      >
                        <Trash2 className="inline w-4 h-4 mr-1" /> Delete
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

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-3">
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
            Table View
          </button>
          <button
            className={`px-3 py-1 text-sm border rounded ${
              viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""
            }`}
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
                  <th key={lvl} className="px-2 py-1 text-left">
                    {lvl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flattenTree(filteredTree).map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {selectedLevels.map((lvl) => (
                    <td key={lvl} className="px-2 py-1 border">
                      {r[lvl] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg p-3 bg-white shadow-sm">
          {filteredTree.length ? (
            filteredTree.map((n) => (
              <div key={n.pcode} className="pl-1">
                {n.children.length > 0 ? (
                  <button
                    onClick={() => {
                      const next = new Set(expanded);
                      next.has(n.pcode)
                        ? next.delete(n.pcode)
                        : next.add(n.pcode);
                      setExpanded(next);
                    }}
                  >
                    {expanded.has(n.pcode) ? (
                      <ChevronDown className="w-4 h-4 inline" />
                    ) : (
                      <ChevronRight className="w-4 h-4 inline" />
                    )}
                  </button>
                ) : (
                  <span className="inline-block w-4" />
                )}
                <span className="font-medium ml-1">{n.name}</span>
                {expanded.has(n.pcode) &&
                  n.children.map((c) => (
                    <div key={c.pcode} className="ml-5">
                      {c.name
