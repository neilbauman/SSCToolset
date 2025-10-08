"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Layers, Database, Upload, CheckCircle2, Trash2, Edit3,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type AdminVersion = { id: string; title: string; year: number | null; dataset_date: string | null; is_active: boolean };
type AdminUnit = { place_uid: string; name: string; pcode: string; level: number; parent_uid?: string | null };

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [search, setSearch] = useState("");
  const [admToggles, setAdmToggles] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const isFetchingRef = useRef(false);

  const selectedLevels = useMemo(
    () => Object.entries(admToggles).filter(([_, v]) => v).map(([k]) => Number(k)),
    [admToggles]
  );

  useEffect(() => {
    supabase.from("countries").select("iso_code,name").eq("iso_code", countryIso).maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  useEffect(() => {
    supabase.from("admin_dataset_versions")
      .select("*").eq("country_iso", countryIso).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setVersions(data);
        setSelectedVersion(data.find(v => v.is_active) || data[0] || null);
      });
  }, [countryIso]);

  useEffect(() => {
    if (!selectedVersion || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMsg("Loading administrative units...");
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch_snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: selectedVersion.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        setUnits(data ?? []);
        setTotalUnits(data?.length ?? 0);
        setProgress(100);
        setLoadingMsg("");
      })
      .catch(() => setLoadingMsg("Failed to load data."))
      .finally(() => (isFetchingRef.current = false));
  }, [selectedVersion]);

  const handleDeleteVersion = async (id: string) => {
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
  };

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const term = search.toLowerCase();
    return units.filter(u =>
      u.name.toLowerCase().includes(term) || u.pcode.toLowerCase().includes(term)
    );
  }, [units, search]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description: "Manage hierarchical administrative units and dataset versions for this country.",
    breadcrumbs: (
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Country Configuration", href: "/country" },
        { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
        { label: "Admins" },
      ]} />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div className="h-1.5 bg-[color:var(--gsc-red)] rounded" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      {/* Dataset Versions */}
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
        {versions.length ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1">Year</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}>
                  <td onClick={() => setSelectedVersion(v)} className="border px-2 py-1 cursor-pointer">{v.title}</td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? (
                      <span className="text-green-700 flex items-center gap-1 justify-center">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    ) : "—"}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    <button className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center" onClick={() => setOpenDelete(v)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (<p className="italic text-gray-500 text-sm">No dataset versions uploaded yet.</p>)}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="border rounded-lg p-3 shadow-sm bg-white">
          <h3 className="text-sm font-semibold mb-2">Admin Levels</h3>
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <label key={lvl} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={admToggles[lvl as 1 | 2 | 3 | 4 | 5]}
                  onChange={() =>
                    setAdmToggles((p) => ({ ...p, [lvl]: !p[lvl as 1 | 2 | 3 | 4 | 5] }))
                  }
                />
                ADM{lvl}
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1"><DatasetHealth totalUnits={totalUnits} /></div>
      </div>

      {/* Search + Tree */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or PCode..."
          className="border rounded px-2 py-1 text-sm w-64"
        />
      </div>

      <AdminUnitsTree units={filteredUnits} activeLevels={selectedLevels} />

      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={() => location.reload()}
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
