"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers,
  Database,
  Upload,
  Edit3,
  Trash2,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import EditAdminDatasetVersionModal from "@/components/country/EditAdminDatasetVersionModal";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

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
  const [viewMode, setViewMode] = useState<"table" | "tree">("tree");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  // Fetch country metadata
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

  // Fetch dataset versions
  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVersions(data);
      const active = data.find((v) => v.is_active);
      const initial = active || data[0] || null;
      setSelectedVersion(initial);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // Fetch admin units with pagination (for large datasets)
  const fetchAllUnits = async (versionId: string) => {
    const limit = 5000;
    let from = 0;
    let to = limit - 1;
    let allRows: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("admin_units")
        .select("id,pcode,name,level,parent_pcode")
        .eq("dataset_version_id", versionId)
        .range(from, to);
      if (error) {
        console.error("Error fetching admin units:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = [...allRows, ...data];
      if (data.length < limit) break;
      from += limit;
      to += limit;
    }
    setUnits(allRows);
  };

  useEffect(() => {
    if (selectedVersion) fetchAllUnits(selectedVersion.id);
  }, [selectedVersion]);

  // Tree building
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

  const toggleExpand = (pcode: string) => {
    const next = new Set(expanded);
    next.has(pcode) ? next.delete(pcode) : next.add(pcode);
    setExpanded(next);
  };

  // Activate a version
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

  // Delete a version (and its admin units)
  const handleDeleteVersion = async (versionId: string) => {
    try {
      await supabase.from("admin_units").delete().eq("dataset_version_id", versionId);
      await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
      setOpenDelete(null);
      await loadVersions();
    } catch (err) {
      console.error("Error deleting version:", err);
    }
  };

  // Render tree recursively
  const renderTreeNode = (n: TreeNode, depth = 0): JSX.Element => (
    <div key={n.pcode} style={{ marginLeft: depth * 16 }} className="py-0.5">
      <div className="flex items-center gap-1">
        {n.children.length > 0 ? (
          <button onClick={() => toggleExpand(n.pcode)}>
            {expanded.has(n.pcode) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4" />
        )}
        <span className="font-medium">{n.name}</span>
        <span className="text-gray-400 text-xs ml-1">{n.pcode}</span>
      </div>
      {expanded.has(n.pcode) &&
        n.children.map((c) => renderTreeNode(c, depth + 1))}
    </div>
  );

  // Parse source JSON (for table rendering)
  const renderSource = (src: string | null) => {
    if (!src) return "—";
    try {
      const parsed = JSON.parse(src);
      if (parsed.url) {
        return (
          <a
            href={parsed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {parsed.name || parsed.url}
          </a>
        );
      }
      return parsed.name || "—";
    } catch {
      return src;
    }
  };

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

  const totalUnits = units.length;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <a
              href="https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/admin_units_template.csv"
              download
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </a>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length > 0 ? (
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
                    selectedVersion?.id === v.id ? "bg-blue-50" : ""
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
                  <td className="border px-2 py-1">{renderSource(v.source)}</td>
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

      <DatasetHealth totalUnits={totalUnits} />

      {/* Admin Units */}
      <div className="mt-4">
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

        {viewMode === "tree" ? (
          <div className="border rounded-lg p-3 bg-white shadow-sm overflow-y-auto max-h-[70vh]">
            {treeData.length ? (
              treeData.map((node) => renderTreeNode(node))
            ) : (
              <p className="italic text-gray-500">No administrative units found.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] border rounded-lg">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100 sticky top-0">
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
          </div>
        )}
      </div>

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
          message={`This will permanently remove "${openDelete.title}" and its records.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}

      {editingVersion && (
        <EditAdminDatasetVersionModal
          open={!!editingVersion}
          onClose={() => setEditingVersion(null)}
          versionId={editingVersion.id}
          onSaved={loadVersions}
        />
      )}
    </SidebarLayout>
  );
}
