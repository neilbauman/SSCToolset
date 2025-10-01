"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Table, Upload, FileDown, Pencil, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";

function StatusBadge({ status }: { status: "uploaded" | "partial" | "missing" }) {
  const colors: Record<string, string> = {
    uploaded: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    missing: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-1 text-xs rounded font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

function CoreBadge() {
  return (
    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
      Core
    </span>
  );
}

export default function AdminUnitsPage({ params }: any) {
  const id = params?.id ?? "unknown";

  const [units, setUnits] = useState<any[]>([]);
  const [status, setStatus] = useState<"uploaded" | "partial" | "missing">("missing");
  const [openUpload, setOpenUpload] = useState(false);
  const [openSource, setOpenSource] = useState(false);
  const [datasetSource, setDatasetSource] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("");

  const fetchUnits = async () => {
    const { data } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", id);

    if (!data || data.length === 0) {
      setStatus("missing");
      setUnits([]);
      setDatasetSource(null);
      return;
    }

    setUnits(data);
    setDatasetSource(data[0]?.source || null);

    const levels = new Set(data.map((u) => u.level));
    if (levels.size >= 3) setStatus("uploaded");
    else setStatus("partial");
  };

  useEffect(() => {
    fetchUnits();
  }, [id]);

  // health checks
  const allPcoded = units.every((u) => u.pcode && u.pcode.trim() !== "");
  const populationCoverage =
    units.length > 0
      ? Math.round(
          (units.filter((u) => u.population && u.population > 0).length /
            units.length) *
            100
        )
      : 0;
  const hasLevels = Array.from(new Set(units.map((u) => u.level)));

  const headerProps = {
    title: "Administrative Units",
    group: "country-config" as const,
    description: "Upload and manage administrative boundaries for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Dataset Health */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Dataset Health <CoreBadge />
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              {allPcoded ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              All units have PCodes
            </li>
            <li className="flex items-center gap-2">
              {populationCoverage > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              Population coverage: {populationCoverage}%
            </li>
            <li className="flex items-center gap-2">
              {hasLevels.length >= 3 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              Levels present: {hasLevels.join(", ") || "None"}
            </li>
          </ul>
        </div>

        {/* Counts per level */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Counts per Level</h3>
          {units.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {Object.entries(
                units.reduce((acc: Record<string, number>, u) => {
                  acc[u.level] = (acc[u.level] || 0) + 1;
                  return acc;
                }, {})
              ).map(([lvl, cnt]) => (
                <li key={lvl}>
                  {lvl}: <span className="font-medium">{cnt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        {/* Dataset Source */}
        <div className="border rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold mb-3">Dataset Source</h3>
            {datasetSource ? (
              <p className="text-sm">{datasetSource}</p>
            ) : (
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                Empty
              </span>
            )}
          </div>
          <button
            onClick={() => setOpenSource(true)}
            className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            <Pencil className="w-4 h-4" /> Edit Source
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            window.location.href = `/api/templates/admin-units?country=${id}`;
          }}
          className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          <FileDown className="w-4 h-4" /> Download Template
        </button>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-1 px-3 py-2 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
        >
          <Upload className="w-4 h-4" /> Upload Data
        </button>
      </div>

      {/* Filter */}
      {units.length > 0 && (
        <div className="mb-4">
          <label className="text-sm font-medium mr-2">Filter by level:</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {hasLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {units.length > 0 ? (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">PCode</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Level</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Population</th>
              </tr>
            </thead>
            <tbody>
              {units
                .filter((u) => !filterLevel || u.level === filterLevel)
                .map((u, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2 text-sm">{u.name}</td>
                    <td className="px-4 py-2 text-sm">{u.pcode}</td>
                    <td className="px-4 py-2 text-sm">{u.level}</td>
                    <td className="px-4 py-2 text-sm">
                      {u.population ? u.population.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No admin units uploaded yet.</p>
      )}

      {/* Upload modal */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={fetchUnits}
        />
      )}

      {/* Edit Source modal */}
      {openSource && (
        <EditDatasetSourceModal
          open={openSource}
          onClose={() => setOpenSource(false)}
          datasetName="Admin Units"
          currentSource={datasetSource || ""}
          onSave={async (newSource) => {
            await supabase
              .from("admin_units")
              .update({ source: newSource })
              .eq("country_iso", id);
            setDatasetSource(newSource);
          }}
        />
      )}
    </SidebarLayout>
  );
}
