import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";
import { groupThemes } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage(props: {
  searchParams?: { version?: string };
}) {
  const openedId = props?.searchParams?.version ?? undefined;

  const versions = await listVersions();
  const theme = groupThemes["ssc-config"];

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

      <PrimaryFrameworkClient versions={versions} openedId={openedId} />
    </div>
  );
}
