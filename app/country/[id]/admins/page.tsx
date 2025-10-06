"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Layers, ListTree, Upload, ChevronDown, ChevronRight } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

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

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Fetch versions
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("admin_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching admin versions:", error);
      else {
        setVersions(data || []);
        const active = data?.find((v) => v.is_active);
        const initial = active || data?.[0] || null;
        setSelectedVersion(initial);
      }
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
      if (error) console.error("Error fetching admin units:", error);
      else setUnits(data || []);
    };
    fetchUnits();
  }, [selectedVersion]);

  // Build tree from flat list
  const buildTree = (rows: AdminUnit[]) => {
    const map: Record<string, AdminUnit & { children: AdminUnit[] }> = {};
    const roots: (AdminUnit & { children: AdminUnit[] })[] = [];
    for (const row of rows) map[row.pcode] = { ...row, children: [] };
    for (const row of rows) {
      if (row.parent_pcode && map[row.parent_pcode]) {
        map[row.parent_pcode].children.push(map[row.pcode]);
      } else roots.push(map[row.pcode]);
    }
    return roots;
  };

  const treeData = buildTree(units);

  const toggleExpand = (pcode: string) => {
    const next = new Set(expanded);
    next.has(pcode) ? next.delete(pcode) : next.add(pcode);
    setExpanded(next);
  };

  const renderTreeNode = (node: AdminUnit & { children: AdminUnit[] }, depth = 0) => (
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

  const headerProps = {
    title: `${countryIso.toUpperCase()} – Administrative Boundaries`,
    group: "country-config" as const,
    description:
      "Manage hierarchical administrative units and dataset versions for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
          { label: "Admins" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Versions Selector */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
              onClick={() => alert("Upload modal coming soon")}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedVersion?.id || ""}
            onChange={(e) => {
              const v = versions.find((x) => x.id === e.target.value) || null;
              setSelectedVersion(v);
            }}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} ({v.year ?? "—"})
                {v.is_active ? " ★" : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="italic text-gray-500">No admin dataset versions found.</p>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-700" /> Administrative Units
        </h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm border ${
              viewMode === "table" ? "bg-blue-50 border-blue-400" : ""
            }`}
            onClick={() => setViewMode("table")}
          >
            Table View
          </button>
          <button
            className={`px-3 py-1 rounded text-sm border ${
              viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""
            }`}
            onClick={() => setViewMode("tree")}
          >
            Tree View
          </button>
        </div>
      </div>

      {/* Conditional Rendering */}
      {viewMode === "table" ? (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-left">PCode</th>
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">Parent PCode</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{u.name}</td>
                <td className="border px-2 py-1">{u.pcode}</td>
                <td className="border px-2 py-1">{u.level}</td>
                <td className="border px-2 py-1">{u.parent_pcode || "—"}</td>
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
    </SidebarLayout>
  );
}
