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
        group="ssc-config"  // ✅ lowercase GroupKey
        tool="Primary Framework Editor"
        description="Manage framework versions created from the SSC catalogue."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework Editor" },
            ]}
          />
        }
      />

      {/* Action buttons */}
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-4 py-2 rounded border border-red-600 text-red-600 hover:bg-red-50 text-sm">
          Duplicate from Catalogue
        </button>
        <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm">
          Publish
        </button>
      </div>

      {/* Editor */}
      <div className="mt-6">
        {selected ? (
          <div className="rounded-lg border border-red-600 bg-white shadow-sm p-4">
            <FrameworkEditor versionId={selected.id} />
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            No framework versions found.
          </div>
        )}
      </div>
    </div>
  );
}
