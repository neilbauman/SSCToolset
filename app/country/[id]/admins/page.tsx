"use client";
import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  Upload,
  Edit3,
  Trash2,
  CheckCircle2,
  Download,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
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

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AdminVersion | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<AdminVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<AdminVersion | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);

  const loadCountry = async () => {
    const { data } = await supabase
      .from("countries")
      .select("*")
      .eq("iso_code", countryIso)
      .maybeSingle();
    if (data) setCountry(data as Country);
  };

  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) return console.error(error);
    setVersions(data ?? []);
    const active = data?.find((v) => v.is_active) || null;
    setSelectedVersion(active);
  };

  const loadUnits = async () => {
    if (!selectedVersion) return;
    setProgress(5);
    setLoadingMsg("Fetching units...");
    const { data, error } = await supabase.rpc("fetch_snapshots", {
      ver_id: selectedVersion.id,
    });
    if (error) {
      console.error(error);
      setLoadingMsg("Failed to load units");
      return;
    }
    setUnits(data ?? []);
    setProgress(100);
    setLoadingMsg("");
  };

  const handleSetActiveVersion = async (versionId: string) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);
    await loadVersions();
  };

  const handleDeleteVersion = async (versionId: string) => {
    await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
    await loadVersions();
  };

  useEffect(() => {
    loadCountry();
    loadVersions();
  }, [countryIso]);

  useEffect(() => {
    loadUnits();
  }, [selectedVersion]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Administrative Boundaries`,
    group: "country-config" as const,
    description: "Manage administrative boundary datasets and hierarchy.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                window.open(
                  "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/admin_units_template.csv"
                )
              }
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </button>
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
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    v.is_active ? "bg-green-50" : ""
                  }`}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">
                    {v.source ? (
                      <a
                        href={v.source}
                        className="text-blue-700 hover:underline"
                        target="_blank"
                      >
                        {v.source.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
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
                          onClick={() => handleSetActiveVersion(v.id)}
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        className="text-gray-700 hover:underline text-xs flex items-center"
                        onClick={() => setEditingVersion(v)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                        onClick={() => setOpenDelete(v)}
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
          <p className="italic text-gray-500">No dataset versions found.</p>
        )}
      </div>

      <DatasetHealth totalUnits={units.length} />
      <AdminUnitsTree units={units} activeLevels={["ADM1"]} />

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
          message={`This will permanently remove "${openDelete.title}" and related data.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteVersion(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}
