import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About"
        group="General"
        description="Information about the SSC Toolset"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "About" },
            ]}
          />
        }
      />
      <div className="mt-4 prose">
        <p>
          The SSC Toolset implements the Global Shelter Cluster’s Shelter Severity
          Classification (SSC) framework for cataloguing pillars, themes, and
          subthemes with clear version control.
        </p>
      </div>
    </div>
  );
}
