import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";

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
      <div className="mt-4">
        {versions.length > 0 ? (
          <ul className="list-disc pl-6">
            {versions.map((v) => (
              <li key={v.id}>
                {v.name} ({v.status})
              </li>
            ))}
          </ul>
        ) : (
          <div>No framework versions found.</div>
        )}
      </div>
    </div>
  );
}
