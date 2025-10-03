"use client";

import Link from "next/link";

type ActiveJoinSummaryCardProps = {
  countryIso: string;
  activeJoin: any;
};

export default function ActiveJoinSummaryCard({ countryIso, activeJoin }: ActiveJoinSummaryCardProps) {
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
        <div className="text-sm space-y-2">
          {/* Admin */}
          <p>
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
          </p>

          {/* Population */}
          <p>
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
          </p>

          {/* GIS */}
          <p>
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
          </p>
        </div>
      ) : (
        <p className="italic text-gray-500">No active join defined yet.</p>
      )}
    </div>
  );
}
