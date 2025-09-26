import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <Button asChild>
          <Link href="/configuration/primary">Open Primary Framework</Link>
        </Button>
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
              <Badge
                variant={v.status === "published" ? "default" : "outline"}
                className="capitalize"
              >
                {v.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-600">No framework versions found.</div>
        )}
      </div>
    </div>
  );
}
