"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  Upload,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Search,
  Loader2,
} from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import EditPopulationVersionModal from "@/components/country/EditPopulationVersionModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type PopulationVersion = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};
type PopulationRecord = {
  pcode: string;
  name: string;
  population: number;
  year: number;
  source: any;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [records, setRecords] = useState<PopulationRecord[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<PopulationVersion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const isFetchingRef = useRef(false);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Load country
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  // Load dataset versions
  const loadVersions = async () => {
    const { data } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!data) return;
    setVersions(data);
    const active = data.find((v) => v.is_active) || data[0] || null;
    setSelectedVersion(active);
  };
  useEffect(() => {
    loadVersions();
  }, [countryIso]);

  // Fetch population data when a version is selected
  useEffect(() => {
    if (!selectedVersion || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMsg("Loading population data...");
    setProgress(10);

    progressTimer.current = setInterval(
      () => setProgress((p) => Math.min(p + 5, 90)),
      200
    );

    supabase
      .from("population_data")
      .select("pcode,name,population,year,source")
      .eq("dataset_version_id", selectedVersion.id)
      .limit(1000)
      .then(({ data }) => {
        setRecords(data || []);
        setProgress(100);
        setLoadingMsg("");
      })
      .catch(() => setLoadingMsg("Failed to load data."))
      .finally(() => {
        isFetchingRef.current = false;
        if (progressTimer.current) clearInterval(progressTimer.current);
      });
  }, [selectedVersion]);

  // Actions
  const handleDeleteVersion = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const handleSaveEdit = async () => {
    if (!editingVersion) return;
    const { id, title, year, dataset_date, source, notes } = editingVersion;
    await supabase
      .from("population_dataset_versions")
      .update({
        title: title?.trim() || null,
        year: year || null,
        dataset_date: dataset_date || null,
        source: source || null,
        notes: notes || null,
      })
      .eq("id", id);
    setEditingVersion(null);
    await loadVersions();
  };

  const handleActivateVersion = async (v: PopulationVersion) => {
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", v.id);
    await loadVersions();
  };

  const handleTemplateDownload = async () => {
    try {
      const url =
        "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/population_template.csv";
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "population_template.csv";
      link.click();
    } catch (e) {
      console.error("Template download failed:", e);
    }
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Data`,
    group: "country-config" as const,
    description:
      "Manage versioned population datasets aligned with administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    if (!t) return records;
    return records.filter(
      (r) =>
        r.name.toLowerCase().includes(t) || r.pcode.toLowerCase().includes(t)
    );
  }, [records, searchTerm]);

  const reloadPage = () => location.reload();

  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{loadingMsg}</p>
        </div>
      )}

      <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleTemplateDownload}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-blue-50 text-blue-700"
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
                <th>Year</th>
                <th>Date</th>
                <th>Source</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                let src: JSX.Element = <span>—</span>;
                if (v.source) {
                  try {
                    const j = JSON.parse(v.source);
                    src = j.url ? (
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {j.name || j.url}
                      </a>
                    ) : (
                      <span>{j.name}</span>
                    );
                  } catch {
                    src = <span>{v.source}</span>;
                  }
                }
                const isSel = selectedVersion?.id === v.id;
                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${v.is_active ? "bg-green-50" : ""}`}
                  >
                    <td
                      onClick={() => setSelectedVersion(v)}
                      className={`border px-2 py-1 cursor-pointer ${
                        isSel ? "font-bold" : ""
                      }`}
                    >
                      {v.title}
                    </td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date ?? "—"}</td>
                    <td className="border px-2 py-1">{src}</td>
                    <td className="border px-2 py-1 text-center">
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
                            onClick={() => handleActivateVersion(v)}
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
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No dataset versions uploaded yet.
          </p>
        )}
      </div>

      {selectedVersion && (
        <>
          <h2 className="text-xl font-bold text-[color:var(--gsc-red)] mb-2">
            {selectedVersion.title}
          </h2>

          <div className="flex items-center mb-3 border rounded-lg px-2 py-1 w-full max-w-md bg-white">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or PCode..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>

          <div className="border rounded-lg bg-white shadow-sm p-3">
            {filtered.length ? (
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left">PCode</th>
                    <th>Name</th>
                    <th>Population</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((r) => (
                    <tr key={r.pcode} className="hover:bg-gray-50">
                      <td className="border px-2 py-1">{r.pcode}</td>
                      <td className="border px-2 py-1">{r.name}</td>
                      <td className="border px-2 py-1 text-right">{r.population}</td>
                      <td className="border px-2 py-1 text-center">{r.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-gray-500 text-sm">
                No data available for this version.
              </p>
            )}
          </div>
        </>
      )}

      {openUpload && (
        <UploadPopulationModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={async () => reloadPage()} // ✅ async wrapper
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

      {editingVersion && (
        <EditPopulationVersionModal
          version={editingVersion}
          onClose={() => setEditingVersion(null)}
          onSaved={loadVersions}
        />
      )}
    </SidebarLayout>
  );
}
