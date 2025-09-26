import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const versions = await listVersions();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of SSC framework data"
        group="Dashboard"
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="mt-4 flex justify-end">
        <Link
          href="/configuration/primary"
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
        >
          Open Primary Framework
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {versions.length > 0 ? (
          versions.map((v) => (
            <div
              key={v.id}
              className="border rounded-lg bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-sm text-gray-500">{v.created_at}</div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  v.status === "published"
                    ? "bg-green-600 text-white"
                    : "border border-gray-300 text-gray-700"
                }`}
              >
                {v.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-600">No framework versions found.</div>
        )}
      </div>
    </div>
  );
}
