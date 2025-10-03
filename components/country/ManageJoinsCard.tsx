"use client";

import Link from "next/link";

type ManageJoinsCardProps = {
  countryIso: string;
  joins?: any[];
};

function JoinRow({ join }: { join: any }) {
  const datasets = join.datasets ?? null;

  // Extract dataset info either from JSON or old fields
  const getSummary = () => {
    if (datasets) {
      return datasets
        .map((d: any) => `${d.type}: ${d.title ?? d.dataset_id ?? "—"}${d.year ? ` (${d.year})` : ""}`)
        .join(", ");
    }
    return [
      join.admin_datasets?.[0]?.title && `Admin: ${join.admin_datasets[0].title}`,
      join.population_datasets?.[0]?.title && `Pop: ${join.population_datasets[0].title}`,
      join.gis_datasets?.[0]?.title && `GIS: ${join.gis_datasets[0].title}`,
    ]
      .filter(Boolean)
      .join(", ");
  };

  return (
    <tr className="border-b">
      <td className="px-2 py-1 text-sm">{join.is_active ? "✅ Active" : ""}</td>
      <td className="px-2 py-1 text-sm">{getSummary() || "—"}</td>
      <td className="px-2 py-1 text-sm text-gray-500">{join.notes ?? "—"}</td>
      <td className="px-2 py-1 text-sm">
        <Link
          href={`/country/${join.country_iso}/joins`}
          className="text-blue-600 hover:underline"
        >
          Manage
        </Link>
      </td>
    </tr>
  );
}

export default function ManageJoinsCard({ countryIso, joins = [] }: ManageJoinsCardProps) {
  return (
    <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Manage Joins</h3>
        <Link
          href={`/country/${countryIso}/joins`}
          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
        >
          View Joins
        </Link>
      </div>

      {joins.length > 0 ? (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Status</th>
              <th className="border px-2 py-1 text-left">Datasets</th>
              <th className="border px-2 py-1 text-left">Notes</th>
              <th className="border px-2 py-1 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {joins.map((join) => (
              <JoinRow key={join.id} join={join} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="italic text-gray-500">No joins defined yet.</p>
      )}
    </div>
  );
}
