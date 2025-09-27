import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AppPage() {
  return (
    <div>
      <PageHeader
        title="SSC Toolset"
        group="dashboard"
        description="Global Shelter Cluster – Shelter Severity Classification"
        breadcrumbs={<Breadcrumbs items={[{ label: "Home" }]} />}
      />

      <div className="prose max-w-none mt-4">
        <p>
          Welcome to the SSC Toolset. Use the navigation to explore configuration and instances.
        </p>
      </div>
    </div>
  );
}
