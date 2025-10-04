"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Upload, FileDown, GitBranch } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label?: string;
  adm1_label?: string;
  adm2_label?: string;
  adm3_label?: string;
  adm4_label?: string;
  adm5_label?: string;
};

type AdminDatasetVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  created_at: string;
  is_active: boolean;
};

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
};

type TreeNode = AdminUnit & { children?: TreeNode[] };

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<AdminDatasetVersion | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [view, setView] = useState<"table" | "tree">("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      return;
    }

    setVersions(data as AdminDatasetVersion[]);
    const active = data?.find((v: any) => v.is_active);
    if (active) {
      setActiveVersion(active);
      fetchAdminUnits(active.id);
    }
  };

  const fetchAdminUnits = async (versionId: string) => {
    const { data, error } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching admin_units:", error);
      return;
    }
    setAdminUnits(data as AdminUnit[]);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleMakeActive = async (versionId: string) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    fetchVersions();
  };

  const handleSelectVersion = (version: AdminDatasetVersion) => {
    setActiveVersion(version);
    fetchAdminUnits(version.id);
  };

  const downloadTemplate = () => {
    const headers = [
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
    ];

    let csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countryIso}_admin_units_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildTree = (): TreeNode[] => {
    const map: Record<string, TreeNode> = {};
    adminUnits.forEach((u) => (map[u.pcode] = { ...u, children: [] }));
    const roots: TreeNode[] = [];

    adminUnits.forEach((u) => {
      if (u.parent_pcode && map[u.parent_pcode]) {
        map[u.parent_pcode].children?.push(map[u.pcode]);
      } else {
        roots.push(map[u.pcode]);
      }
    });
    return roots;
  };

  const filtered = adminUnits.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Versions table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>
        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Year</th>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Source</th>
                <th className="border px-2 py-1">Active</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    activeVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year}</td>
                  <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? "✓" : ""}
                  </td>
                  <td className="border px-2 py-1 space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleSelectVersion(v)}
                    >
                      Select
                    </button>
                    {!v.is_active && (
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => handleMakeActive(v.id)}
                      >
                        Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* Dataset health */}
      <DatasetHealth totalUnits={adminUnits.length} />

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "table"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("table")}
        >
          Table View
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded ${
            view === "tree"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setView("tree")}
        >
          Tree View
        </button>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <input
              type="text"
              placeholder="Search by name or PCode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border px-3 py-1 rounded w-1/3 text-sm"
            />
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
            </button>
          </div>

          {paginated.length > 0 ? (
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
                {paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{u.name}</td>
                    <td className="border px-2 py-1">{u.pcode}</td>
                    <td className="border px-2 py-1">{u.level}</td>
                    <td className="border px-2 py-1">{u.parent_pcode ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="italic text-gray-500">No admin units found</p>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-3 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={page >= (totalPages || 1)}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Tree View */}
      {view === "tree" && (
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <GitBranch className="w-5 h-5 text-blue-600" /> Hierarchical View
          </h2>
          <TreeDisplay nodes={buildTree()} />
        </div>
      )}

      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}

function TreeDisplay({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="text-sm ml-4 border-l pl-3">
      {nodes.map((node) => (
        <li key={node.pcode} className="mb-1">
          <span className="font-medium">{node.name}</span>{" "}
          <span className="text-gray-500 text-xs">({node.level})</span>
          {node.children && node.children.length > 0 && (
            <TreeDisplay nodes={node.children} />
          )}
        </li>
      ))}
    </ul>
  );
}
