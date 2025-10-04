"use client";

import { useState, useEffect, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import EditAdminDatasetVersionModal from "@/components/country/EditAdminDatasetVersionModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Database, Upload, FileDown, MoreVertical, Check, Link2 } from "lucide-react";
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
  country_iso: string;
  title: string;
  year: number;
  dataset_date: string | null;
  source: string | null;
  created_at: string;
  is_active: boolean;
  notes: string | null;
};

type AdminUnit = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  parent_pcode: string | null;
};

type JoinRow = {
  id: string;
  datasets: any[]; // array of objects that may contain { dataset_version_id: string }
  is_active: boolean;
};

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<AdminDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<AdminDatasetVersion | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<AdminDatasetVersion | null>(null);
  const [linkedMap, setLinkedMap] = useState<Record<string, boolean>>({});
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AdminDatasetVersion | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<AdminDatasetVersion | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // -------- Data loads ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    })();
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
    const list = (data || []) as AdminDatasetVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active) || null;
    setActiveVersion(active);

    // Keep the currently selected one if still present; else default to active
    const keepSelected =
      selectedVersion && list.find((v) => v.id === selectedVersion.id)
        ? selectedVersion
        : active;
    setSelectedVersion(keepSelected || null);

    if (keepSelected?.id) {
      fetchAdminUnits(keepSelected.id);
    } else if (active?.id) {
      fetchAdminUnits(active.id);
    } else {
      setAdminUnits([]);
    }
  };

  const fetchLinkedMap = async () => {
    // Pull all joins for this country and build a map of versionId -> isLinked
    const { data, error } = await supabase
      .from("dataset_joins")
      .select("id, datasets, is_active")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching dataset_joins:", error);
      setLinkedMap({});
      return;
    }
    const rows = (data || []) as JoinRow[];

    const map: Record<string, boolean> = {};
    rows.forEach((row) => {
      const arr = Array.isArray(row.datasets) ? row.datasets : [];
      for (const item of arr) {
        const vid = item?.dataset_version_id;
        if (vid) map[vid] = true;
      }
    });
    setLinkedMap(map);
  };

  useEffect(() => {
    fetchVersions();
    fetchLinkedMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  const fetchAdminUnits = async (versionId: string) => {
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
  };

  // -------- Actions ----------
  const handleSelectVersion = (version: AdminDatasetVersion) => {
    setSelectedVersion(version);
    fetchAdminUnits(version.id);
  };

  const handleMakeActive = async (versionId: string) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    await fetchVersions();
  };

  const handleDeactivate = async (versionId: string) => {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("id", versionId);
    await fetchVersions();
  };

  const handleDeleted = async (versionId: string) => {
    // Delete all units for that version, then delete the version row.
    // (Hard delete is allowed only when not linked & not active, UI enforces that)
    await supabase
      .from("admin_units")
      .delete()
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    await supabase
      .from("admin_dataset_versions")
      .delete()
      .eq("id", versionId);

    setDeletingVersion(null);
    await fetchVersions();
    await fetchLinkedMap();
  };

  // -------- Template download ----------
  const downloadTemplate = () => {
    const headers = [
      "Adm1 Name",
      "Adm1 PCode",
      "Adm2 Name",
      "Adm2 PCode",
      "Adm3 Name",
      "Adm3 PCode",
      "Adm4 Name",
      "Adm4 PCode",
      "Adm5 Name",
      "Adm5 PCode",
    ];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countryIso}_admin_units_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // -------- Computed ----------
  const statusBadge = (v: AdminDatasetVersion) => {
    const isLinked = !!linkedMap[v.id];
    const active = v.is_active;

    if (active && isLinked) {
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-blue-600 text-white">
          <Check className="w-3 h-3" /> Active
          <span className="mx-0.5">•</span>
          <Link2 className="w-3 h-3" /> Linked
        </span>
      );
    }
    if (active) {
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-green-600 text-white">
          <Check className="w-3 h-3" /> Active
        </span>
      );
    }
    if (isLinked) {
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-amber-500 text-white">
          <Link2 className="w-3 h-3" /> Linked
        </span>
      );
    }
    return <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200">—</span>;
  };

  const canHardDelete = (v: AdminDatasetVersion) => !v.is_active && !linkedMap[v.id];

  // Keep menu popover small/simple (no extra deps)
  const RowMenu = ({ v }: { v: AdminDatasetVersion }) => {
    const open = menuOpenId === v.id;
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpenId(open ? null : v.id)}
          className="p-1 rounded hover:bg-gray-100"
          aria-label="Open row menu"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <div
            onMouseLeave={() => setMenuOpenId(null)}
            className="absolute right-0 z-10 mt-2 w-40 rounded border bg-white shadow"
          >
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={() => {
                setMenuOpenId(null);
                handleSelectVersion(v);
              }}
            >
              Select
            </button>
            {!v.is_active && (
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                onClick={() => {
                  setMenuOpenId(null);
                  handleMakeActive(v.id);
                }}
              >
                Make Active
              </button>
            )}
            {v.is_active && (
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                onClick={() => {
                  setMenuOpenId(null);
                  handleDeactivate(v.id);
                }}
              >
                Deactivate
              </button>
            )}
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={() => {
                setMenuOpenId(null);
                setEditingVersion(v);
              }}
            >
              Edit
            </button>
            <button
              disabled={!canHardDelete(v)}
              className={`w-full text-left px-3 py-2 text-sm ${
                canHardDelete(v)
                  ? "hover:bg-red-50 text-red-600"
                  : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!canHardDelete(v)) return;
                setMenuOpenId(null);
                setDeletingVersion(v);
              }}
            >
              Delete Permanently
            </button>
          </div>
        )}
      </div>
    );
  };

  const totalUnits = adminUnits.length;

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
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
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
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-left">Actions</th>
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
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year}</td>
                  <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">{statusBadge(v)}</td>
                  <td className="border px-2 py-1">
                    <RowMenu v={v} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* Health */}
      <DatasetHealth totalUnits={totalUnits} />

      {/* Units */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Admin Units {selectedVersion ? `– ${selectedVersion.title}` : ""}
          </h2>
          {selectedVersion && (
            <span className="text-xs text-gray-500">
              Version ID: {selectedVersion.id}
            </span>
          )}
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
                  <td className="border px-2 py-1">{u.parent_pcode || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : selectedVersion ? (
          <p className="italic text-gray-500">
            No units found for this version. Upload a dataset or select another version.
          </p>
        ) : (
          <p className="italic text-gray-500">Select a version to view its units.</p>
        )}
      </div>

      {/* Modals */}
      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          await fetchVersions();
          await fetchLinkedMap();
        }}
      />

      {editingVersion && (
        <EditAdminDatasetVersionModal
          open={!!editingVersion}
          onClose={() => setEditingVersion(null)}
          version={editingVersion}
          onSaved={async () => {
            setEditingVersion(null);
            await fetchVersions();
          }}
        />
      )}

      {deletingVersion && (
        <ConfirmDeleteModal
          open={!!deletingVersion}
          title="Delete Version Permanently"
          message={`This will permanently remove the version "${deletingVersion.title}" and all its admin units. This cannot be undone.`}
          confirmLabel="Delete Permanently"
          onCancel={() => setDeletingVersion(null)}
          onConfirm={async () => {
            await handleDeleted(deletingVersion.id);
          }}
        />
      )}
    </SidebarLayout>
  );
}
