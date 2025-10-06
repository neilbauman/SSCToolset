"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import { Layers, Database, Upload, ChevronDown, ChevronRight } from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
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
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch versions
  useEffect(() => {
    const fetchVersions = async () => {
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
    fetchVersions();
  }, [countryIso]);

  // Fetch admin units for selected version
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedVersion) {
        setUnits([]);
        return;
      }

      const { data, error } = await supabase
        .from("admin_units")
        .select("id,pcode,name,level,parent_pcode")
        .eq("dataset_version_id", selectedVersion.id)
        .order("pcode", { ascending: true });

      if (error) {
        console.error("Error fetching admin units:", error);
        return;
      }

      setUnits(data ?? []);
    };

    fetchUnits();
  }, [selectedVersion]);

  // Build tree structure
  const buildTree = (rows: AdminUnit[]): TreeNode[] => {
    const map: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];
    for (const row of rows) map[row.pcode] = { ...row, children: [] };
    for (const row of rows) {
      if (row.parent_pcode && map[row.parent_pcode]) {
        map[row.parent_pcode].children.push(map[row.pcode]);
      } else roots.push(map[row.pcode]);
    }
    return roots;
  };

  const treeData = buildTree(units);

  // Toggle expand/collapse in tree view
  const toggleExpand = (pcode: string) => {
    const next = new Set(expanded);
    next.has(pcode) ? next.delete(pcode) : next.add(pcode);
    setExpanded(next);
  };

  // Recursive render for tree nodes
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

  // Delete dataset version (and related data)
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const { data: units } = await supabase
        .from("admin_units")
        .select("id")
        .eq("dataset_version_id", versionId);

      const unitIds = (units ?? []).map((u) => u.id);

      if (unitIds.length) {
        await supabase.from("admin_units").delete().in("id", unitIds);
      }

      await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
      setOpenDelete(null);

      const { data: refreshed } = await supabase
        .from("admin_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });

      setVersions(refreshed ?? []);
    } catch (err) {
      console.error("Error deleting admin dataset version:", err);
    }
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

  const totalUnits = units.length;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions Section */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
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

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    selectedVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedVersion(v)}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">{v.source ?? "—"}</td>
                  <td className="border px-2 py-1">
                    {v.is_active ? (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        —
                      </span>
                    )}
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
          {treeData.length ? (
            treeData.map((node) => renderTreeNode(node))
          ) : (
            <p className="italic text-gray-500">No admin units found.</p>
          )}
        </div>
      )}

      {/* Modals */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={async () => {
            const { data } = await supabase
              .from("admin_dataset_versions")
              .select("*")
              .eq("country_iso", countryIso)
              .order("created_at", { ascending: false });
            setVersions(data ?? []);
          }}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove the version "${openDelete.title}" and all related admin units. This cannot be undone.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}
