"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  Layers,
  Database,
  Upload,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [view, setView] = useState<"table" | "tree">("table");
  const [expanded, setExpanded] = useState(new Set<string>());
  const [editVersion, setEditVersion] = useState<any>(null);
  const [deleteVersion, setDeleteVersion] = useState<any>(null);
  const [upload, setUpload] = useState(false);

  // --- Fetch Country & Versions ---
  const loadCountryAndVersions = async () => {
    const { data: c } = await supabase
      .from("countries")
      .select("*")
      .eq("iso_code", countryIso)
      .single();
    if (c) setCountry(c);

    const { data: v } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (v) {
      setVersions(v);
      setSelectedVersion(v.find((x) => x.is_active) || v[0]);
    }
  };

  useEffect(() => {
    loadCountryAndVersions();
  }, [countryIso]);

  // --- Fetch Admin Units (with progress) ---
  useEffect(() => {
    if (!selectedVersion) return;
    (async () => {
      setLoading(true);
      setProgress("Counting records…");
      const { count } = await supabase
        .from("admin_units")
        .select("*", { count: "exact", head: true })
        .eq("dataset_version_id", selectedVersion.id);
      const total = count || 0;
      setProgress(`Found ${total.toLocaleString()} records…`);
      const page = 1000;
      let from = 0,
        all: any[] = [];
      while (true) {
        const { data } = await supabase
          .rpc("get_admin_units_full", { version_id: selectedVersion.id })
          .range(from, from + page - 1);
        if (!data?.length) break;
        all = all.concat(data);
        from += page;
        setProgress(`Loaded ${all.length.toLocaleString()} / ${total.toLocaleString()}…`);
        if (data.length < page) break;
      }
      setUnits(all);
      setProgress("");
      setLoading(false);
    })();
  }, [selectedVersion]);

  // --- Tree Builder ---
  const buildTree = (rows: any[]): any[] => {
    const map: any = {};
    const roots: any[] = [];
    rows.forEach((r) => (map[r.pcode] = { ...r, children: [] }));
    rows.forEach((r) =>
      r.parent_pcode && map[r.parent_pcode]
        ? map[r.parent_pcode].children.push(map[r.pcode])
        : roots.push(map[r.pcode])
    );
    return roots;
  };
  const treeData = buildTree(units);

  const toggleExpand = (p: string) => {
    const n = new Set(expanded);
    n.has(p) ? n.delete(p) : n.add(p);
    setExpanded(n);
  };

  // --- Delete Version ---
  const handleDeleteVersion = async (versionId: string) => {
    try {
      await supabase.from("admin_units").delete().eq("dataset_version_id", versionId);
      await supabase.from("admin_dataset_versions").delete().eq("id", versionId);
      setDeleteVersion(null);
      await loadCountryAndVersions();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // --- Save Edit Version ---
  const handleSaveEdit = async (v: any) => {
    await supabase.from("admin_dataset_versions").update(v).eq("id", v.id);
    setEditVersion(null);
    await loadCountryAndVersions();
  };

  // --- Header ---
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between mb-3 items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <a
              href="https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/admin_units_template.csv"
              download
              className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </a>
            <button
              onClick={() => setUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload
            </button>
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1">Year</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Source</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}>
                  <td
                    onClick={() => setSelectedVersion(v)}
                    className={`border px-2 py-1 cursor-pointer ${
                      selectedVersion?.id === v.id ? "font-semibold" : ""
                    }`}
                  >
                    {v.title}
                  </td>
                  <td className="border px-2 py-1 text-center">{v.year ?? "—"}</td>
                  <td className="border px-2 py-1 text-center">{v.dataset_date ?? "—"}</td>
                  <td className="border px-2 py-1">
                    {(() => {
                      try {
                        const src = JSON.parse(v.source || "{}");
                        if (src.url && src.name)
                          return (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              {src.name}
                            </a>
                          );
                        if (src.url)
                          return (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              {src.url}
                            </a>
                          );
                        return v.source || "—";
                      } catch {
                        return v.source || "—";
                      }
                    })()}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1 text-right flex gap-3 justify-end">
                    <button
                      onClick={() => setEditVersion(v)}
                      title="Edit"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteVersion(v)}
                      title="Delete"
                      className="text-[color:var(--gsc-red)] hover:opacity-70"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No dataset versions yet.</p>
        )}
      </div>

      <DatasetHealth totalUnits={units.length} />

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Administrative Units
        </h2>
        <div className="flex gap-2">
          {["table", "tree"].map((m) => (
            <button
              key={m}
              onClick={() => setView(m as any)}
              className={`px-3 py-1 text-sm border rounded ${
                view === m ? "bg-blue-50 border-blue-400" : ""
              }`}
            >
              {m[0].toUpperCase() + m.slice(1)} View
            </button>
          ))}
        </div>
      </div>

      {/* Table or Tree */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-700 mb-2" />
            <span className="text-sm text-gray-700 font-medium">{progress}</span>
          </div>
        )}

        {view === "table" ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                {["Name", "PCode", "Level", "Parent"].map((h) => (
                  <th key={h} className="border px-2 py-1 text-left">
                    {h}
                  </th>
                ))}
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
              treeData.map((n) => (
                <div key={n.pcode} style={{ marginLeft: 16 }}>
                  <div className="flex items-center gap-1">
                    {n.children.length ? (
                      <button onClick={() => toggleExpand(n.pcode)}>
                        {expanded.has(n.pcode) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                    <span>{n.name}</span>
                    <span className="text-gray-500 text-xs ml-1">{n.pcode}</span>
                  </div>
                  {expanded.has(n.pcode) &&
                    n.children.map((c) => (
                      <div key={c.pcode} className="ml-6">
                        {c.name}{" "}
                        <span className="text-gray-400">({c.pcode})</span>
                      </div>
                    ))}
                </div>
              ))
            ) : (
              <p className="italic text-gray-500">No admin units found.</p>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {upload && (
        <UploadAdminUnitsModal
          open={upload}
          onClose={() => setUpload(false)}
          countryIso={countryIso}
          onUploaded={() => window.location.reload()}
        />
      )}

      {/* Delete Modal */}
      {deleteVersion && (
        <ConfirmDeleteModal
          open={!!deleteVersion}
          message={`This will permanently delete "${deleteVersion.title}" and all related units.`}
          onClose={() => setDeleteVersion(null)}
          onConfirm={() => handleDeleteVersion(deleteVersion.id)}
        />
      )}

      {/* Edit Modal */}
      {editVersion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Edit Dataset Version</h3>
            {["title", "source", "notes"].map((f) => (
              <label key={f} className="block mb-2 text-sm">
                {f[0].toUpperCase() + f.slice(1)}
                <input
                  type="text"
                  value={editVersion[f] || ""}
                  onChange={(e) => setEditVersion({ ...editVersion, [f]: e.target.value })}
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              </label>
            ))}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setEditVersion(null)} className="px-3 py-1 text-sm border rounded">
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editVersion)}
                className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
