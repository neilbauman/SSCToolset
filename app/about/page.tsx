import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About"
        subtitle="Global Shelter Cluster SSC App"
        breadcrumbs={<Breadcrumbs items={[{ label: "About" }]} />}
      />
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-gray-700">
          This app is a modular, scalable toolset for SSC: catalogues → versions → standards → instances.
        </p>
      </div>
    </div>
  );
}
