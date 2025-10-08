"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
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
  place_uid: string;
  parent_uid: string | null;
  name: string;
  pcode: string;
  level: number;
  depth: number;
  path_uid: string[];
};

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [levels, setLevels] = useState(["ADM1"]);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);

  // ---------- Fetch Country ----------
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data as Country));
  }, [countryIso]);

  // ---------- Load Versions ----------
  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) return console.error(error);
    const list = data ?? [];
    setVersions(list);
    setSelectedVersion(list.find((v) => v.is_active) || list[0] || null);
  };
  useEffect(() => { loadVersions(); }, [countryIso]);

  // ---------- Fetch Units via Edge Function ----------
  useEffect(() => {
    if (!selectedVersion) return;
    const fetchUnits = async () => {
      setUnits([]);
      setProgress(10);
      setLoadingMsg("Fetching administrative hierarchy…");
      try {
        const { data: result, error } = await supabase.functions.invoke("fetch_snapshots", {
          body: { version_id: selectedVersion.id },
        });
        console.log("Function result:", result);
        if (error) throw error;
        if (result && Array.isArray(result)) {
          setUnits(result);
          setProgress(100);
          setLoadingMsg("");
        } else if (result?.data && Array.isArray(result.data)) {
          setUnits(result.data);
          setProgress(100);
          setLoadingMsg("");
        } else {
          throw new Error("Invalid data structure returned from fetch_snapshots");
        }
      } catch (err) {
        console.error("Fetch failed:", err);
        setLoadingMsg("Failed to load units.");
      }
    };
    fetchUnits();
  }, [selectedVersion]);

  // ---------- Delete version ----------
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const { error: unitsErr } = await supabase
        .from("place_snapshots")
        .delete()
        .eq("dataset_version_id", versionId);
      if (unitsErr) throw unitsErr;

      const { error: verErr } = await supabase
        .from("admin_dataset_versions")
        .delete()
        .eq("id", versionId);
      if (verErr) throw verErr;

      setOpenDelete(null);
      await loadVersions();
    } catch (err) {
      console.error("Error deleting version:", err);
    }
  };

  // ---------- Level Controls ----------
  const levelNames = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
  const levelMap = useMemo(() => {
    const map: Record<number, AdminUnit[]> = {};
    for (const u of units) {
      if (!map[u.level]) map[u.level] = [];
      map[u.level].push(u);
    }
    return map;
  }, [units]);

  const toggleLevel = (lvl: string) => {
    const next = levels.includes(lvl)
      ? levels.filter((l) => l !== lvl)
      : [...levels, lvl];
    if (next.length === 0) next.push("ADM1");
    setLevels(next);
  };

  // ---------- Table View ----------
  const TableView = () => {
    const activeLevels = levelNames.filter((l) => levels.includes(l));
    if (!units.length) return <p className="italic text-gray-500">No data found.</p>;
    const byRoot = levelMap[1] || [];

    return (
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {activeLevels.map((lvl) => (
                <th key={lvl} className="px-2 py-1 text-left">{lvl}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byRoot.map((adm1) => {
              const children = levelMap[2]?.filter((u) => u.path_uid.includes(adm1.place_uid)) || [];
              if (activeLevels.length === 1)
                return <tr key={adm1.place_uid}><td className="px-2 py-1">{adm1.name}</td></tr>;
              return children.map((adm2) => (
                <tr key={adm2.place_uid}>
                  {activeLevels.includes("ADM1") && <td className="px-2 py-1">{adm1.name}</td>}
                  {activeLevels.includes("ADM2") && <td className="px-2 py-1">{adm2.name}</td>}
                  {activeLevels.length > 2 &&
                    activeLevels.slice(2).map((l) => <td key={l} className="px-2 py-1">—</td>)}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ---------- Header ----------
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
      {/* Progress Bar */}
      {loadingMsg && (
        <div className="mb-3">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
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
                    onClick={() => setSelectedVersion(v)}
                    className={`border px-2 py-1 cursor-pointer ${selectedVersion?.id === v.id ? "font-semibold" : ""}`}
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
                  <td className="border px-2 py-1">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingVersion(v)}
                        className="text-gray-700 text-xs flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => setOpenDelete(v)}
                        className="text-[color:var(--gsc-red)] text-xs flex items-center"
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
          <p className="italic text-gray-500">No versions found.</p>
        )}
      </div>

      {/* Admin Toggles + Dataset Health */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <h3 className="text-sm font-semibold mb-1">Admin Levels</h3>
          <div className="flex flex-wrap gap-2">
            {["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((l) => (
              <label key={l} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={levels.includes(l)} onChange={() => toggleLevel(l)} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <DatasetHealth totalUnits={units.length} />
      </div>

      {/* Administrative Units */}
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
        <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
      </h2>
      <div className="flex justify-end gap-2 mb-2">
        <button
          className={`px-3 py-1 text-sm border rounded ${viewMode === "table" ? "bg-blue-50 border-blue-400" : ""}`}
          onClick={() => setViewMode("table")}
        >
          Table
        </button>
        <button
          className={`px-3 py-1 text-sm border rounded ${viewMode === "tree" ? "bg-blue-50 border-blue-400" : ""}`}
          onClick={() => setViewMode("tree")}
        >
          Tree
        </button>
      </div>

      {viewMode === "table" ? <TableView /> : <p>Tree prototype coming soon.</p>}

      {/* Upload/Delete Modals */}
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
          message={`This will permanently remove version "${openDelete.title}".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}
