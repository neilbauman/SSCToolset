import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";
import SidebarLayout from "@/components/layout/SidebarLayout";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage(props: any) {
  const searchParams = props?.searchParams as { version?: string } | undefined;
  const openedId = searchParams?.version ?? undefined;

  const versions = await listVersions();

  const headerProps = {
    title: "Primary Framework Editor",
    group: "ssc-config" as const,
    description: "Manage framework versions created from the SSC catalogue.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SSC Configuration", href: "/configuration" },
          { label: "Primary Framework Editor" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <PrimaryFrameworkClient versions={versions} openedId={openedId} />
    </SidebarLayout>
  );
}
