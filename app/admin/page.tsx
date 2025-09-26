import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const versions = await listVersions();

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Administrative SSC tools"
        group="Admin"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Admin" },
            ]}
          />
        }
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
