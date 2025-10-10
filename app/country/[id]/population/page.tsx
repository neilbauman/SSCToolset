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
  Loader2,
} from "lucide-react";
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
  source: any;
  is_active: boolean;
  created_at: string;
};
type PopulationRow = {
  pcode: string;
  name: string | null;
  population: number;
};

export default function PopulationPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PopulationVersion | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [totalPopulation, setTotalPopulation] = useState<number>(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState<PopulationVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<PopulationVersion | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch country info
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code,name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  // Fetch dataset versions
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

  // Fetch population data
  useEffect(() => {
    if (!selectedVersion || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMsg("Loading population data...");

    supabase
      .from("population_data")
      .select("pcode,name,population")
      .eq("dataset_version_id", selectedVersion.id)
      .then(({ data }) => {
        setRows(data || []);
        const total = data?.reduce((sum, r) => sum + (r.population || 0), 0) || 0;
        setTotalPopulation(total);
        setLoadingMsg("");
        isFetchingRef.current = false;
      });
  }, [selectedVersion]);

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

  const handleDeleteVersion = async (id: string) => {
    await supabase.from("population_dataset_versions").delete().eq("id", id);
    setOpenDelete(null);
    await loadVersions();
  };

  const reloadPage = () => {
    loadVersions();
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Data`,
    group: "country-config" as const,
    description:
      "Upload and manage versioned population datasets aligned with administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          {
            label: country?.name ?? countryIso,
            href: `/country/${countryIso}`,
          },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded">
            <div
              className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all duration-300"
              style={{ width: "100%" }}
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
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload Dataset
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
                    const j =
                      typeof v.source === "string"
                        ? JSON.parse(v.source)
                        : v.source;
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

                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${
                      v.is_active ? "bg-green-50" : ""
                    }`}
                  >
                    <td
                      onClick={() => setSelectedVersion(v)}
                      className={`border px-2 py-1 cursor-pointer ${
                        selectedVersion?.id === v.id ? "font-bold" : ""
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
                          <CheckCircle2 className="w-4 h-4" />
                          Active
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
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                          onClick={() => setOpenDelete(v)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
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
            No population datasets uploaded yet.
          </p>
        )}
      </div>

      {selectedVersion && (
        <div className="border rounded-lg p-4 shadow-sm bg-white">
          <h3 className="text-lg font-semibold mb-3">
            {selectedVersion.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Total population (sum):{" "}
            <strong>
              {totalPopulation.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </strong>
          </p>

          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">PCode</th>
                <th>Name</th>
                <th>Population</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pcode}>
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.name ?? "—"}</td>
                  <td className="border px-2 py-1 text-right">
                    {r.population.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openUpload && (
        <UploadPopulationModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={async () => reloadPage()} // ✅ fixed async signature
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
          versionId={editingVersion.id}
          onClose={() => setEditingVersion(null)}
          onSaved={loadVersions}
        />
      )}
    </SidebarLayout>
  );
}
