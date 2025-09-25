import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

export default function PrimaryFrameworkPage() {
  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        subtitle="Catalogue → Version (draft → publish)"
        breadcrumbs={<Breadcrumbs items={[
          { label: "SSC Configuration" },
          { label: "Primary Framework Editor" }
        ]} />}
      />
      <FrameworkEditor />
    </div>
  );
}
