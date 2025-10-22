"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Database, PlusCircle } from "lucide-react";
import DerivedDatasetsPanel from "@/components/country/DerivedDatasetsPanel";

// 🟢 GSC brand colors pulled from palette (reference only)
const GSC_COLORS = {
  blue: "#0082cb",
  darkBlue: "#003764",
  greyLight: "#f3f1ee",
  greyMid: "#97b8b1",
  red: "#640811",
};

export default function DerivedDatasetsPage() {
  const { id } = useParams() as { id: string };
  const iso = id?.toUpperCase() || "";

  // Page state (simple)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [iso]);

  return (
    <SidebarLayout
      headerProps={{
        title: "Derived Datasets",
        group: "country-config",
        description:
          "Create and manage derived datasets by combining existing datasets and indicators.",
        tool: "Derived datasets let you compute ratios, multipliers, or additive indicators.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Country", href: `/country/${iso}` },
              { label: "Derived Datasets" },
            ]}
          />
        ),
      }}
    >
      <section className="p-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[--color-accent, #0082cb]" />
            <h1 className="text-sm font-semibold text-[--color-text-primary, #003764]">
              Derived Datasets
            </h1>
          </div>
          <button
            onClick={() => {
              const scroll = document.querySelector("#derived-datasets-panel");
              scroll?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-1 bg-[#0082cb] hover:bg-[#006fae] text-white text-xs px-3 py-1.5 rounded-md transition"
          >
            <PlusCircle size={14} /> Create New
          </button>
        </div>

        {/* Description */}
        <p className="text-[13px] text-gray-600 max-w-2xl">
          Derived datasets are automatically calculated by combining Core, Other,
          or Derived datasets. Use this section to preview, save, and classify
          new derived indicators for {iso}.
        </p>

        {/* Panel */}
        <div
          id="derived-datasets-panel"
          className="border border-[#cdd4d0] rounded-lg bg-white shadow-sm"
        >
          <DerivedDatasetsPanel countryIso={iso} />
        </div>

        {/* Footer */}
        <div className="text-[11px] text-gray-500 border-t border-gray-200 pt-2">
          Global Shelter Cluster | SSC Toolset 2025 · v1.0
        </div>
      </section>
    </SidebarLayout>
  );
}
