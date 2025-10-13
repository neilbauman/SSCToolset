"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const headerProps = {
    title: "About",
    group: "about" as const,
    description: "Overview of the Shelter Severity Classification (SSC) Toolset.",
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
      <div className="prose max-w-4xl">
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

        {/* Conceptual Diagram */}
        <div className="flex justify-center my-8">
          <div className="relative w-full max-w-3xl">
            <svg viewBox="0 0 700 400" className="w-full h-auto">
              {/* Underlying Vulnerabilities */}
              <rect
                x="60"
                y="220"
                width="180"
                height="80"
                rx="10"
                fill="#60a5fa"
                opacity="0.8"
              />
              <text
                x="150"
                y="260"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                Underlying
              </text>
              <text
                x="150"
                y="278"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                Vulnerabilities
              </text>

              {/* Hazard & Exposure */}
              <rect
                x="260"
                y="100"
                width="180"
                height="80"
                rx="10"
                fill="#f59e0b"
                opacity="0.8"
              />
              <text
                x="350"
                y="138"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                Hazard & Exposure
              </text>
              <text
                x="350"
                y="156"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                Data
              </text>

              {/* SSC Framework */}
              <rect
                x="460"
                y="220"
                width="180"
                height="80"
                rx="10"
                fill="#ef4444"
                opacity="0.8"
              />
              <text
                x="550"
                y="260"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                SSC Framework
              </text>

              {/* Arrows */}
              <line
                x1="240"
                y1="260"
                x2="460"
                y2="260"
                stroke="#9ca3af"
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />
              <line
                x1="350"
                y1="180"
                x2="350"
                y2="220"
                stroke="#9ca3af"
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />

              {/* Output */}
              <rect
                x="260"
                y="320"
                width="180"
                height="50"
                rx="8"
                fill="#16a34a"
                opacity="0.9"
              />
              <text
                x="350"
                y="350"
                textAnchor="middle"
                fontSize="14"
                fill="#fff"
                fontWeight="600"
              >
                SSC Severity Classification (1–5)
              </text>

              {/* Arrowhead Definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        <p className="text-sm text-gray-500 text-center -mt-4 mb-8">
          Simplified conceptual model showing how vulnerability, hazard, and
          shelter conditions interact to define severity.
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

        <blockquote className="my-6 border-l-4 border-gray-300 pl-4 italic text-gray-700">
          “Given existing vulnerabilities, and the spatial footprint of a
          hazard, how severely have shelter conditions been affected?”
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
