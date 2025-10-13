// app/about/page.tsx
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const headerProps = {
    title: "About",
    group: "about" as const,
    description: "Information about the SSC Toolset.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "About" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="prose max-w-3xl">
        <h2>Purpose</h2>
        <p>
          The <strong>Shelter Severity Classification (SSC)</strong> Toolset
          supports the humanitarian shelter sector by bringing together diverse
          datasets to assess, model, and visualize the severity of shelter
          needs. It enables coordination teams and technical actors to
          understand where populations are most at risk, why, and how conditions
          are evolving after a crisis.
        </p>

        <h2>Conceptual Model</h2>
        <p>
          The SSC builds on a simple but powerful logic: shelter severity is
          determined by the intersection of three complementary data layers.
        </p>

        <ul>
          <li>
            <strong>Shelter Conditions (SSC Framework)</strong> — what has
            happened to people’s sheltering situation, measured through the
            Pillars, Themes, and Subthemes of the SSC Framework (e.g. % damaged
            houses, tenure security, displacement).
          </li>
          <li>
            <strong>Underlying Vulnerabilities</strong> — pre-existing social,
            economic, and environmental factors that influence how severely
            people are affected by a shock (e.g. poverty, remoteness, access to
            markets, building quality).
          </li>
          <li>
            <strong>Hazard &amp; Exposure Data</strong> — spatial or physical
            representations of where and how intensely a hazard occurs (e.g.
            flood extent, typhoon track, earthquake intensity).
          </li>
        </ul>

        <p>
          These three layers interact to answer key questions about shelter
          severity:
        </p>
        <blockquote>
          <em>
            Given existing vulnerabilities, and the spatial footprint of a
            hazard, how severely have shelter conditions been affected?
          </em>
        </blockquote>

        <h2>Analytical Structure</h2>
        <p>
          The SSC Framework describes shelter-specific conditions, while the
          Underlying Vulnerabilities and Hazard Data provide contextual and
          predictive insight. Together, they feed into an{" "}
          <strong>SSC Instance</strong> — a specific analysis for a
          country-crisis combination — to compute shelter severity scores (1–5)
          across administrative areas.
        </p>

        <h2>Architecture Overview</h2>
        <p>
          The Toolset organizes data around interoperable catalogues and
          frameworks:
        </p>
        <ul>
          <li>
            <strong>Indicator Catalogue</strong> — shared repository of
            measurable indicators across SSC, Vulnerability, and Hazard
            categories.
          </li>
          <li>
            <strong>Frameworks</strong> — structured classification systems for
            SSC Pillars/Themes/Subthemes and Vulnerability Dimensions.
          </li>
          <li>
            <strong>Country Configurations</strong> — country-specific datasets
            and metadata that define available data and analysis parameters.
          </li>
          <li>
            <strong>SSC Instances</strong> — context-specific calculations of
            shelter severity for a given disaster or crisis.
          </li>
        </ul>

        <h2>Intended Use</h2>
        <p>
          The SSC Toolset is intended for humanitarian analysts, shelter
          coordinators, and technical partners who need a consistent, transparent
          way to calculate, compare, and visualize shelter severity across
          countries and crises.
        </p>

        <h2>Governance and Future Direction</h2>
        <p>
          The Toolset is maintained under the coordination of the{" "}
          <strong>Global Shelter Cluster</strong>. It is designed to remain
          modular, data-agnostic, and open to integration with other analytical
          frameworks that describe humanitarian vulnerability, exposure, and
          impact.
        </p>
      </div>
    </SidebarLayout>
  );
}
