import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage() {
  const versions = await listVersions();

  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="ssc-config"
        description="Manage framework versions created from the SSC catalogue."
        tool="Primary Framework Editor"
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

      {/* Hand off *all interactivity* to the client */}
      <PrimaryFrameworkClient versions={versions} />
    </div>
  );
}
