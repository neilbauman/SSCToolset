"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

interface CountryDatasetSummaryProps {
  countryIso: string;
}

export default function CountryDatasetSummary({
  countryIso,
}: CountryDatasetSummaryProps) {
  const [adminSummary, setAdminSummary] = useState<any>(null);
  const [popSummary, setPopSummary] = useState<any>(null);
  const [gisSummary, setGisSummary] = useState<any>(null);
  const [otherDatasets, setOtherDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummaries = async () => {
      setLoading(true);

      const [{ data: admin }, { data: pop }, { data: gis }, { data: others }] =
        await Promise.all([
          supabase.rpc("get_country_admin_summary", { p_country_iso: countryIso }),
          supabase.rpc("get_country_population_summary", {
            p_country_iso: countryIso,
          }),
          supabase.rpc("get_country_gis_summary", { p_country_iso: countryIso }),
          supabase
            .from("view_dataset_summary")
            .select("*")
            .eq("country_iso", countryIso)
            .not("dataset_type", "in", "(admin,population,gis)"),
        ]);

      setAdminSummary(admin || null);
      setPopSummary(pop || null);
      setGisSummary(gis || null);
      setOtherDatasets(others || []);
      setLoading(false);
    };
    loadSummaries();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading dataset summaries...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Core Datasets</h2>

      {/* Core dataset cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Admin Areas */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/admins`}
            className="text-xl font-semibold text-blue-800 hover:underline"
          >
            Admin Areas
          </Link>
          <div className="mt-1">
            {adminSummary ? (
              <>
                <p className="text-gray-700 text-sm">
                  {adminSummary.title} ({adminSummary.year})
                </p>
                {adminSummary.levels?.map((lvl: any) => (
                  <p key={lvl.level} className="text-sm">
                    <strong>{lvl.level}</strong> – {lvl.pcodes} pcodes (
                    {lvl.records} records)
                  </p>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-sm">No admin dataset found</p>
            )}
          </div>
          <div className="mt-3 text-sm">
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>

        {/* Population Data */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/population`}
            className="text-xl font-semibold text-blue-800 hover:underline"
          >
            Population Data
          </Link>
          <div className="mt-1">
            {popSummary ? (
              <>
                <p className="text-gray-700 text-sm">
                  {popSummary.title} ({popSummary.year})
                </p>
                <p className="text-sm">
                  Total population: {popSummary.total_population?.toLocaleString()}
                </p>
                <p className="text-sm">
                  Coverage: {popSummary.coverage_admins} admin areas
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No population dataset found</p>
            )}
          </div>
          <div className="mt-3 text-sm">
            <Link
              href={`/country/${countryIso}/population`}
              className="text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>

        {/* GIS Layers */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/gis`}
            className="text-xl font-semibold text-blue-800 hover:underline"
          >
            GIS Layers
          </Link>
          <div className="mt-1">
            {gisSummary ? (
              <>
                <p className="text-gray-700 text-sm">
                  {gisSummary.title} ({gisSummary.year})
                </p>
                {gisSummary.layers?.map((l: any) => (
                  <p key={l.admin_level} className="text-sm">
                    <strong>{l.admin_level}</strong> – {l.features} features (
                    {l.coverage_pct?.toFixed(1)}%)
                  </p>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-sm">No GIS layers found</p>
            )}
          </div>
          <div className="mt-3 text-sm">
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>
      </div>

      {/* Other datasets */}
      <h2 className="text-2xl font-semibold mb-2">Other Datasets</h2>
      {otherDatasets.length === 0 ? (
        <p className="text-gray-500 italic text-sm">
          No other datasets uploaded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Indicator</th>
                <th className="text-left px-3 py-2">Admin Level</th>
                <th className="text-left px-3 py-2">Records</th>
                <th className="text-left px-3 py-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {otherDatasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="px-3 py-2">{d.indicator || "—"}</td>
                  <td className="px-3 py-2">{d.admin_level || "—"}</td>
                  <td className="px-3 py-2">
                    {d.record_count?.toLocaleString() || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      good
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
