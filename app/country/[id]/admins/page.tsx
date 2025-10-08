"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Loader2, Table, TreeDeciduous } from "lucide-react";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import React from "react";

type AdminUnit = {
  id: string;
  country_iso: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
  dataset_version_id: string;
};

type DatasetVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
};

export default function CountryAdminsPage({ params }: { params: { id: string } }) {
  const { id: countryIso } = params;
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pageSize = 1000;

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const renderSource = (src: string | null) => {
    if (!src) return "—";
    const isUrl = /^https?:\/\//i.test(src);
    return isUrl ? (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {src}
      </a>
    ) : (
      src
    );
  };

  const fetchVersions = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("dataset_date", { ascending: false });
    if (error) console.error(error);
    if (data) {
      setVersions(data);
      const active = data.find((v) => v.is_active);
      setActiveVersionId(active?.id ?? null);
    }
  }, [countryIso]);

  const fetchAdminUnits = useCallback(
    async (versionId: string) => {
      setAdminUnits([]);
      setProgress(0);
      setLoading(true);

      let from = 0;
      let to = pageSize - 1;
      let totalFetched = 0;
      const allUnits: AdminUnit[] = [];

      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = setInterval(() => {
        setProgress((p) => (p < 95 ? p + 1 : p));
      }, 300);

      while (true) {
        const { data, error, count } = await supabase
          .from("admin_units")
          .select("*", { count: "exact" })
          .eq("country_iso", countryIso)
          .eq("dataset_version_id", versionId)
          .range(from, to);

        if (error) {
          console.error(error);
          break;
        }
        if (data && data.length > 0) {
          allUnits.push(...data);
          totalFetched += data.length;
          if (count)
            setProgress(Math.min(100, Math.round((totalFetched / count) * 100)));
        }
        if (!data || data.length < pageSize) break;
        from += pageSize;
        to += pageSize;
      }

      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setAdminUnits(allUnits);
      setLoading(false);
    },
    [countryIso]
  );

  const toggleExpand = (pcode: string) => {
    setExpanded((prev) => ({ ...prev, [pcode]: !prev[pcode] }));
  };

  // ✅ FIXED: buildTree now returns React.ReactNode[] (flattened properly)
  const buildTree = (units: AdminUnit[]): React.ReactNode[] => {
    const map: Record<string, AdminUnit[]> = {};
    units.forEach((u) => {
      const parent = u.parent_pcode ?? "root";
      if (!map[parent]) map[parent] = [];
      map[parent].push(u);
    });

    const renderNode = (pcode: string, level = 0): React.ReactNode[] => {
      const children = map[pcode] || [];
      const rows: React.ReactNode[] = [];
      children.forEach((child) => {
        rows.push(
          <tr key={child.id} className="border-b">
            <td className="px-3 py-2">
              <div
                className="flex items-center cursor-pointer"
                style={{ marginLeft: `${level * 1.25}rem` }}
                onClick={() => toggleExpand(child.pcode)}
              >
                {map[child.pcode]?.length > 0 && (
                  <span className="mr-1 text-gray-500">
                    {expanded[child.pcode] ? "▾" : "▸"}
                  </span>
                )}
                {child.name}
              </div>
            </td>
            <td className="px-3 py-2 text-sm text-gray-700">{child.level}</td>
            <td className="px-3 py-2 text-sm text-gray-700">{child.pcode}</td>
          </tr>
        );
        if (expanded[child.pcode]) rows.push(...renderNode(child.pcode, level + 1));
      });
      return rows;
    };

    return renderNode("root");
  };

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    if (activeVersionId) fetchAdminUnits(activeVersionId);
  }, [activeVersionId, fetchAdminUnits]);

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
    const blob = new Blob([headers.join(",") + "\n"], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countryIso}_admin_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Countries", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Administrative Units" },
        ]}
      />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <UploadAdminUnitsModal countryIso={countryIso} onUploaded={fetchVersions} />
            <button
              onClick={downloadTemplate}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
            >
              Template (ADM1–ADM5)
            </button>
          </div>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Title</th>
              <th className="px-3 py-2 font-semibold">Year</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Active</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">{v.title}</td>
                <td className="px-3 py-2">{v.year ?? "—"}</td>
                <td className="px-3 py-2">{v.dataset_date ?? "—"}</td>
                <td className="px-3 py-2">{renderSource(v.source)}</td>
                <td className="px-3 py-2">{v.is_active ? "✅" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {loading && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {viewMode === "table" ? (
            <Table className="h-5 w-5 text-gray-500" />
          ) : (
            <TreeDeciduous className="h-5 w-5 text-gray-500" />
          )}
          Administrative Units
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={`px-2 py-1 rounded ${
              viewMode === "table" ? "bg-blue-100 text-blue-700" : "bg-gray-100"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`px-2 py-1 rounded ${
              viewMode === "tree" ? "bg-blue-100 text-blue-700" : "bg-gray-100"
            }`}
          >
            Tree
          </button>
        </div>
      </div>

      {!loading && adminUnits.length > 0 && (
        <div className="border rounded-md overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left sticky top-0">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Level</th>
                <th className="px-3 py-2 font-semibold">PCode</th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "table"
                ? adminUnits.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2 text-gray-700">{u.level}</td>
                      <td className="px-3 py-2 text-gray-700">{u.pcode}</td>
                    </tr>
                  ))
                : buildTree(adminUnits)}
            </tbody>
          </table>
        </div>
      )}

      {!loading && adminUnits.length === 0 && (
        <p className="text-gray-500 text-sm">No administrative units found.</p>
      )}

      <DatasetHealth datasetVersionId={activeVersionId} />
    </div>
  );
}
