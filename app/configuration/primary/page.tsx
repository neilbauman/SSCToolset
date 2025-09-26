import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";
import { listVersions } from "@/lib/services/framework";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage() {
  const versions = await listVersions();
  const selected = versions?.[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Primary Framework"
        subtitle="Configure and review the SSC framework."
        group="SSC Configuration"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework" },
            ]}
          />
        }
      />

      <div className="mt-4 flex justify-end gap-2">
        <button className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200 text-sm">
          Duplicate from Catalogue
        </button>
        <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm">
          Publish
        </button>
      </div>

      <div className="mt-6">
        {selected ? (
          <FrameworkEditor versionId={selected.id} />
        ) : (
          <div>No versions found.</div>
        )}
      </div>
    </div>
  );
}
