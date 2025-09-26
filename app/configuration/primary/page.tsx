import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";
import { listVersions } from "@/lib/services/framework";

// ✅ Supabase pages must be dynamic
export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage() {
  const versions = await listVersions();
  const selected = versions?.[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Primary Framework"
        subtitle="Configure and review the SSC framework."
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework" },
            ]}
          />
        }
      />
      <div className="mt-4">
        {selected ? (
          <FrameworkEditor versionId={selected.id} />
        ) : (
          <div>No versions found.</div>
        )}
      </div>
    </div>
  );
}
