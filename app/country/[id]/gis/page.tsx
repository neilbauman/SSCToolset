"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, FileDown, MoreVertical } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type GISVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ✅ Layer toggles (ADM0–ADM5)
  const [layerToggles, setLayerToggles] = useState({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  // --- Dropdown close handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Fetch Country Info
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // --- Fetch GIS Dataset Versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching GIS versions:", error);
      return;
    }

    const list = (data ?? []) as GISVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    setSelectedVersion(active || list[0] || null);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // --- Header Configuration
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize uploaded administrative boundary layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // --- Layer Toggle Handler
  const handleLayerToggle = (key: keyof typeof layerToggles) => {
    setLayerToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Inline Actions Menu
  const ActionsMenu = ({ v }: { v: GISVersion }) => {
    const isSelected = selectedVersion?.id === v.id;
    const isActive = !!v.is_active;

    return (
      <div className="relative" ref={menuRef}>
        <button
          className="text-blue-700 hover:underline flex items-center gap-1"
          onClick={() => setOpenMenuFor(openMenuFor === v.id ? null : v.id)}
        >
          Actions <MoreVertical className="w-4 h-4" />
        </button>

        {openMenuFor === v.id && (
          <div className="absolute right-0 mt-2 w-40 rounded border bg-white shadow z-10">
            {!isSelected && (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  setSelectedVersion(v);
                  setOpenMenuFor(null);
                }}
              >
                Select
              </button>
            )}
            {!isActive && (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={async () => {
                  await supabase
                    .from("gis_dataset_versions")
                    .update({ is_active: false })
                    .eq("country_iso", countryIso);
                  await supabase.from("gis_dataset_versions").update({ is_active: true }).eq("id", v.id);
                  await fetchVersions();
                  setOpenMenuFor(null);
                }}
              >
                Make Active
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Dataset Versions Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" /> GIS Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const csv = "layer,source,year\n";
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Country_Config_GIS_Template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-gray-50"
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

        {versions.length ? (
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
              {versions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                const isActive = !!v.is_active;
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                    <td className="border px-2 py-1">{v.title || "—"}</td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                    <td className="border px-2 py-1">{v.source || "—"}</td>
                    <td className="border px-2 py-1">
                      {isActive ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          —
                        </span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <ActionsMenu v={v} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No GIS datasets uploaded yet</p>
        )}
      </div>

      {/* --- Dataset Health --- */}
      <DatasetHealth totalUnits={versions.length} />

      {/* --- Layer Toggles Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mt-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Layers (toggle visibility)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {Object.keys(layerToggles).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={layerToggles[key as keyof typeof layerToggles]}
                onChange={() => handleLayerToggle(key as keyof typeof layerToggles)}
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      {/* --- Map Placeholder --- */}
      <div className="border rounded-lg p-8 text-center text-gray-500 italic">
        GIS visualization will appear here once layers are loaded.
      </div>

      {/* --- Upload Modal --- */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}
