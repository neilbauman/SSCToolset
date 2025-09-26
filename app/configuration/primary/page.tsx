import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";
import { listVersions } from "@/lib/services/framework";
import { groupThemes } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage() {
  const versions = await listVersions();
  const selected = versions?.[0] ?? null;
  const theme = groupThemes["ssc-config"];

  return (
    <div>
      <PageHeader
        group="ssc-config"
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
        <button
          className={`px-4 py-2 rounded border text-sm ${theme.border} ${theme.text} ${theme.hover}`}
        >
          Duplicate from Catalogue
        </button>
        <button
          className={`px-4 py-2 rounded text-sm text-white ${theme.text} ${theme.hover} bg-[color:var(--gsc-blue)] hover:bg-blue-900`}
        >
          Publish
        </button>
      </div>

      {/* Editor */}
      <div className="mt-6">
        {selected ? (
          <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
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
