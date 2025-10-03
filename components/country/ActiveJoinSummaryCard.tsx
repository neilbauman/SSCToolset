"use client";

import Link from "next/link";

type ActiveJoinSummaryCardProps = {
  countryIso: string;
  activeJoin: any;
  statusData?: {
    admins: any[];
    pop: any[];
    gis: any[];
  };
};

function StatusBadge({ status }: { status: "uploaded" | "partial" | "missing" | "empty" }) {
  const styles: Record<string, string> = {
    uploaded: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    missing: "bg-red-100 text-red-700",
    empty: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

function computeStatus(key: "admins" | "population" | "gis", statusData?: any) {
  if (!statusData) return "empty";

  if (key === "admins") {
    const admins = statusData.admins || [];
    if (admins.length === 0) return "missing";
    const levels = new Set(admins.map((a: any) => a.level));
    const required = ["ADM0", "ADM1", "ADM2"];
    const hasAll = required.every((lvl) => levels.has(lvl));
    return hasAll ? "uploaded" : "partial";
  }

  if (key === "population") {
    const pop = statusData.pop || [];
    if (pop.length === 0) return "missing";
    const invalid = pop.some(
      (p: any) => !p.pcode || !p.population || p.population <= 0
    );
    return invalid ? "partial" : "uploaded";
  }

  if (key === "gis") {
    const gis = statusData.gis || [];
    if (gis.length === 0) return "missing";
    const invalid = gis.some((g: any) => !g.crs || !g.crs.startsWith("EPSG:"));
    return invalid ? "partial" : "uploaded";
  }

  return "empty";
}

export default function ActiveJoinSummaryCard({ countryIso, activeJoin, statusData }: ActiveJoinSummaryCardProps) {
  return (
    <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Active Join Summary</h3>
        <Link
          href={`/country/${countryIso}/joins`}
          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
        >
          Manage Joins
        </Link>
      </div>

      {activeJoin ? (
        <div className="text-sm space-y-3">
          {/* Admin */}
          <div>
            <p className="flex items-center gap-2">
              <strong>Admin:</strong>{" "}
              {activeJoin.admin_datasets?.[0]?.title ? (
                <Link
                  href={`/country/${countryIso}/admins`}
                  className="text-blue-700 hover:underline"
                >
                  {activeJoin.admin_datasets[0].title} ({activeJoin.admin_datasets[0].year})
                </Link>
              ) : (
                "—"
              )}
              <StatusBadge status={computeStatus("admins", statusData)} />
            </p>
            <p className="text-xs text-gray-500 ml-6">
              Completeness: {activeJoin.admin_datasets?.[0]?.completeness ?? "—"}%
            </p>
          </div>

          {/* Population */}
          <div>
            <p className="flex items-center gap-2">
              <strong>Population:</strong>{" "}
              {activeJoin.population_datasets?.[0]?.title ? (
                <Link
                  href={`/country/${countryIso}/population`}
                  className="text-blue-700 hover:underline"
                >
                  {activeJoin.population_datasets[0].title} ({activeJoin.population_datasets[0].year})
                </Link>
              ) : (
                "—"
              )}
              <StatusBadge status={computeStatus("population", statusData)} />
            </p>
            <p className="text-xs text-gray-500 ml-6">
              Completeness: {activeJoin.population_datasets?.[0]?.completeness ?? "—"}%
            </p>
          </div>

          {/* GIS */}
          <div>
            <p className="flex items-center gap-2">
              <strong>GIS:</strong>{" "}
              {activeJoin.gis_datasets?.[0]?.title ? (
                <Link
                  href={`/country/${countryIso}/gis`}
                  className="text-blue-700 hover:underline"
                >
                  {activeJoin.gis_datasets[0].title} ({activeJoin.gis_datasets[0].year})
                </Link>
              ) : (
                "—"
              )}
              <StatusBadge status={computeStatus("gis", statusData)} />
            </p>
            <p className="text-xs text-gray-500 ml-6">
              Completeness: {activeJoin.gis_datasets?.[0]?.completeness ?? "—"}%
            </p>
          </div>
        </div>
      ) : (
        <p className="italic text-gray-500">No active join defined yet.</p>
      )}
    </div>
  );
}
