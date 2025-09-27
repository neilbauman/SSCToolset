import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About"
        group="about"
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

      <div className="prose max-w-none mt-4">
        <p>
          The Shelter and Settlements Severity Classification (SSC) Toolset is
          part of the Global Shelter Cluster initiative. It helps catalog pillars,
          themes, and subthemes to standardize the assessment and reporting of
          shelter severity across contexts.
        </p>
      </div>
    </div>
  );
}
