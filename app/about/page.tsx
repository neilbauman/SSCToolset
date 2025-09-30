import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About"
        group="about"
        description="Information about the SSC Toolset."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "About" },
            ]}
          />
        }
      />

      <div className="prose max-w-3xl mt-6">
        <p>
          The Shelter and Settlements Severity Classification (SSC) Toolset is
          developed under the Global Shelter Cluster to support humanitarian
          actors in systematically assessing, classifying, and monitoring shelter
          and settlement needs and response.
        </p>
        <p>
          This toolset provides a framework and supporting catalogue of pillars,
          themes, subthemes, and indicators. It enables country teams to configure
          and adapt the framework to local contexts, while maintaining
          comparability across responses.
        </p>
        <p>
          The SSC Toolset is designed to evolve over time and support operational
          decision-making by providing clear, consistent, and evidence-based
          severity classifications.
        </p>
      </div>
    </div>
  );
}
