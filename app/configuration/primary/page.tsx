import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default async function PrimaryFrameworkPage() {
  const { data: versions } = await supabaseBrowser
    .from("framework_versions")
    .select("*")
    .order("created_at", { ascending: true });

  const selected = versions?.[0];

  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="SSC Configuration"
        subtitle="Create and manage framework versions based on the catalogues"
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
      <div className="mt-4">
        {selected && (
          <FrameworkEditor versionId={selected.id} />
        )}
      </div>
    </div>
  );
}
