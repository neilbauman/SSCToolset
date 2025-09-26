import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="SSC Toolset"
        subtitle="Global Shelter Cluster – Shelter Severity Classification"
        group="General"
        breadcrumbs={<Breadcrumbs items={[{ label: "Home" }]} />}
      />
      <div className="mt-4 prose">
        <p>
          Welcome to the SSC Toolset. Use the dashboard to explore and configure
          framework versions for the Global Shelter Cluster’s Shelter Severity
          Classification system.
        </p>
      </div>
    </div>
  );
}
