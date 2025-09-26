import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

export default function PrimaryFrameworkPage() {
  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="SSC Configuration"
        subtitle="Define and manage pillars, themes, and subthemes of the SSC framework."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration" },
              { label: "Primary Framework" },
            ]}
          />
        }
      />
      <FrameworkEditor />
    </div>
  );
}
