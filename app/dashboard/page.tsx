import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        group="General"
        subtitle="Overview of SSC Toolset"
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/configuration/primary"
          className="block rounded-lg border bg-white p-4 hover:shadow"
        >
          <h3 className="font-medium text-gray-900">SSC Configuration</h3>
          <p className="text-sm text-gray-600">
            Manage Frameworks & Standards
          </p>
        </Link>

        <Link
          href="/about"
          className="block rounded-lg border bg-white p-4 hover:shadow"
        >
          <h3 className="font-medium text-gray-900">About</h3>
          <p className="text-sm text-gray-600">Project info</p>
        </Link>
      </div>
    </div>
  );
}
