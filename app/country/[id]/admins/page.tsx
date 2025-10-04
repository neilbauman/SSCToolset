"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Upload, FileDown } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type AdminDatasetVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string | null;
  source?: string | null;
  created_at: string;
  is_active: boolean;
};

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string; // "ADM1"... "ADM5"
  parent_pcode: string | null;
};

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminDatasetVersion[]>([]);
  const [lowestByVersion, setLowestByVersion] = useState<Record<string, string>>({});
  const [activeVersion, setActiveVersion] = useState<AdminDatasetVersion | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  async function fetchVersions() {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      return;
    }

    const list = (data || []) as AdminDatasetVersion[];
    setVersions(list);

    // default active
    const active = list.find((v) => v.is_active) || null;
    setActiveVersion(active || null);
    if (active) fetchAdminUnits(active.id);

    // compute Lowest Level for each version (live)
    const mapping: Record<string, string> = {};
    for (const v of list) {
      const lowest = await computeLowestLevel(v.id);
      mapping[v.id] = lowest || "—";
    }
    setLowestByVersion(mapping);
  }

  async function fetchAdminUnits(versionId: string) {
    const { data, error } = await supabase
      .from("admin_units")
      .select("id, pcode, name, level, parent_pcode")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching admin_units:", error);
      return;
    }
    setAdminUnits((data || []) as AdminUnit[]);
  }

  async function computeLowestLevel(versionId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("admin_units")
      .select("level")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error reading levels:", error);
      return null;
    }
    const levels = (data || []).map((r: any) => r.level).filter(Boolean) as string[];
    if (levels.length === 0) return null;

    const toNum = (lvl: string) => Number(lvl.replace("ADM", "")) || 0;
    const maxNum = Math.max(...levels.map(toNum));
    return `ADM${maxNum}`;
  }

  async function handleMakeActive(versionId: string) {
    await supabase.from("admin_dataset_versions").update({ is_active: false }).eq("country_iso", countryIso);
    await supabase.from("admin_dataset_versions").update({ is_active: true }).eq("id", versionId);
    await fetchVersions();
    await fetchAdminUnits(versionId);
  }

  function handleSelectVersion(v: AdminDatasetVersion) {
    setActiveVersion(v);
    fetchAdminUnits(v.id);
  }

  function downloadTemplate() {
    // Universal ADM1–ADM5 template
    const headers = [
      "ADM1 Name","ADM1 PCode",
      "ADM2 Name","ADM2 PCode",
      "ADM3 Name","ADM3 PCode",
      "ADM4 Name","ADM4 PCode",
      "ADM5 Name","ADM5 PCode",
    ];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countryIso}_admin_units_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative place names and PCodes.",
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
      {/* Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
          </div>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Lowest Level</th>
                <th className="border px-2 py-1 text-center">Active</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${activeVersion?.id === v.id ? "bg-blue-50" : ""}`}>
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">{v.source ?? "—"}</td>
                  <td className="border px-2 py-1">{lowestByVersion[v.id] || "—"}</td>
                  <td className="border px-2 py-1 text-center">{v.is_active ? "✓" : ""}</td>
                  <td className="border px-2 py-1 space-x-3">
                    <button className="text-blue-600 hover:underline" onClick={() => handleSelectVersion(v)}>
                      Select
                    </button>
                    {!v.is_active && (
                      <button className="text-green-600 hover:underline" onClick={() => handleMakeActive(v.id)}>
                        Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet.</p>
        )}
      </div>

      {/* Health */}
      <DatasetHealth totalUnits={adminUnits.length} />

      {/* Active version’s Admin Units */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {activeVersion ? `Admin Units — ${activeVersion.title}` : "Admin Units"}
          </h2>
        </div>

        {adminUnits.length > 0 ? (
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
              {adminUnits.map((u) => (
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
          <p className="italic text-gray-500">No admin units found for the selected version.</p>
        )}
      </div>

      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}
