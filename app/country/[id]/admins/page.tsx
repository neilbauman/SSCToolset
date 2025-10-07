"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
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
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
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
type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
};
type TreeNode = AdminUnit & { children: TreeNode[] };

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  const [progressText, setProgressText] = useState<string>("");

  // --- Fetch Country ---
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // --- Fetch Versions ---
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

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // --- Fetch Admin Units (with progress and dynamic count) ---
  useEffect(() => {
    if (!selectedVersion) return;

    const fetchUnits = async () => {
      try {
        setProgressText("Preparing to load records…");

        // Step 1: Get total record count dynamically
        const { count, error: countError } = await supabase
          .from("admin_units")
          .select("*", { count: "exact", head: true })
          .eq("dataset_version_id", selectedVersion.id);

        const total = countError ? null : count || null;
        if (total) setProgressText(`Total records: ${total.toLocaleString()}. Starting fetch…`);
        else setProgressText("Starting fetch…");

        // Step 2: Paginate through all data
        const pageSize = 1000;
        let from = 0;
        let allData: any[] = [];
        let progress = 0;

        while (true) {
          const { data, error } = await supabase
            .rpc("get_admin_units_full", { version_id: selectedVersion.id })
            .range(from, from + pageSize - 1);

          if (error) throw error;
          if (!data?.length) break;

          allData = allData.concat(data);
          progress += data.length;

          if (total)
            setProgressText(
              `Loading ${progress.toLocaleString()} / ${total.toLocaleString()} rows…`
            );
          else setProgressText(`Loading ${progress.toLocaleString()} rows…`);

          if (data.length < pageSize) break;
          from += pageSize;
        }

        setUnits(allData);
        setProgressText("");
      } catch (err) {
        console.error("Error fetching admin units:", err);
        setProgressText("Error loading data.");
      }
    };

    fetchUnits();
  }, [selectedVersion]);

  // --- Build Tree ---
  const buildTree = (rows: AdminUnit[]): TreeNode[] => {
    const map: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];
    for (const row of rows) map[row.pcode] = { ...row, children: [] };
    for (const row of rows) {
      if (row.parent_pcode && map[row.parent_pcode])
        map[row.parent_pcode].children.push(map[row.pcode]);
      else roots.push(map[row.pcode]);
    }
    return roots;
  };
  const treeData = buildTree(units);

  // --- Tree Toggle ---
  const toggleExpand = (pcode: string) => {
    const next = new Set(expanded);
    next.has(pcode) ? next.delete(pcode) : next.add(pcode);
    setExpanded(next);
  };

  const renderTreeNode = (node: TreeNode, depth = 0): JSX.Element => (
    <div key={node.pcode} style={{ marginLeft: depth * 16 }} className="py-0.5">
      <div className="flex items-center gap-1">
        {node.children.length > 0 ? (
          <button onClick={() => toggleExpand(node.pcode)}>
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
        node.children.map((child) => renderTreeNode(child, depth + 1))}
    </div>
  );

  // --- Delete Version ---
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const { data: units } = await supabase
        .from("admin_units")
        .select("id")
        .eq("dataset_version_id", versionId);
      const unitIds = (units ?? []).map((u) => u.id);
      if (unitIds.length) await supabase.from("admin_units").delete().in("id", unitIds);
      await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
      setOpenDelete(null);
      await loadVersions();
    } catch (err) {
      console.error("Error deleting admin dataset version:", err);
    }
  };

  // --- Activate Version ---
  const handleActivateVersion = async (version: AdminVersion) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", version.id);
    await loadVersions();
  };

  // --- Save Edited Version ---
  const handleSaveEdit = async (updated: Partial<AdminVersion>) => {
    if (!editingVersion) return;
    await supabase
      .from("admin_dataset_versions")
      .update(updated)
      .eq("id", editingVersion.id);
    setEditingVersion(null);
    await loadVersions();
  };

  const templateUrl =
    "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/admin_units_template.csv";

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
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admins" },
        ]}
      />
    ),
  };

  const totalUnits = units.length;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <div className="flex gap-2">
            <a
              href={templateUrl}
              download
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </a>
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
                <tr key={v.id} className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}>
                  <td
                    className={`border px-2 py-1 cursor-pointer ${selectedVersion?.id === v.id ? "font-semibold" : ""}`}
                    onClick={() => setSelectedVersion(v)}
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
                  <td className="border px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      {!v.is_active && (
                        <button className="text-blue-600 hover:underline text-xs" onClick={() => handleActivateVersion(v)}>
                          Set Active
                        </button>
                      )}
                      <button className="text-gray-600 hover:underline text-xs" onClick={() => setEditingVersion(v)}>
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

      {/* Dataset Health */}
      <DatasetHealth totalUnits={totalUnits} />

      {/* View Toggle + Progress */}
      <div className="flex justify-between items-center mb-2">
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

      {progressText && (
        <div className="text-sm text-gray-600 font-medium mb-2 animate-pulse">
          {progressText}
        </div>
      )}

      {/* Admin Units */}
      {viewMode === "table" ? (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">Parent</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{u.name}</td>
                <td className="border px-2 py-1">{u.pcode}</td>
                <td className="border px-2 py-1">{u.level}</td>
                <td className="border px-2 py-1">{u.parent_pcode ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="border rounded-lg p-3 bg-white shadow-sm">
          {treeData.length ? treeData.map((node) => renderTreeNode(node)) : (
            <p className="italic text-gray-500">No admin units found.</p>
          )}
        </div>
      )}
    </SidebarLayout>
  );
}
