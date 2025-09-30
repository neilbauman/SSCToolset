import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage() {
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

      {/* Version Manager + Framework Editor */}
      <PrimaryFrameworkClient />
    </div>
  );
}
