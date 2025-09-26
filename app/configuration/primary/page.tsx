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
      <PrimaryFrameworkClient versions={versions} />
    </div>
  );
}
