"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/Button";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function CountryConfigLandingPage({ params }: any) {
  const id = params?.id ?? "unknown";

  // Mock metadata (replace with Supabase later)
  const country = {
    iso: id,
    name: id === "PHL" ? "Philippines" : id === "NPL" ? "Nepal" : "Honduras",
  };

  // Mock dataset status (will later query Supabase)
  const datasets = [
    {
      key: "admins",
      title: "Places / Admin Units",
      description: "Administrative boundaries and place codes.",
      status: "uploaded", // "uploaded" | "partial" | "missing"
      stats: "4 levels, 38 units",
      icon: <Map className="w-6 h-6 text-green-600" />,
    },
    {
      key: "population",
      title: "Populations / Demographics",
      description: "Census population and demographic indicators.",
      status: "missing",
      stats: "",
      icon: <Users className="w-6 h-6 text-gray-500" />,
    },
    {
      key: "gis",
      title: "GIS / Mapping",
      description: "Geospatial boundary data and mapping layers.",
      status: "partial",
      stats: "ADM1 & ADM2 uploaded, ADM3 missing",
      icon: <Database className="w-6 h-6 text-yellow-600" />,
    },
  ];

  const [otherDatasets] = useState([
    {
      key: "housing",
      title: "Housing Conditions",
      description: "Shelter type, damage, and habitability data.",
      status: "uploaded",
      stats: "Census 2020 dataset",
    },
  ]);

  const headerProps = {
    title: `${country.name} – Country Configuration`,
    group: "country-config" as const,
    description: "Manage baseline datasets and metadata for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country.name },
        ]}
      />
    ),
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
            ✅ Uploaded
          </span>
        );
      case "partial":
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
            ⚠️ Partial
          </span>
        );
      case "missing":
      default:
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
            ❌ Missing
          </span>
        );
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((d) => (
          <div
            key={d.key}
            className="border rounded-lg p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {d.icon}
                <h3 className="text-lg font-semibold">{d.title}</h3>
              </div>
              {statusBadge(d.status)}
            </div>
            <p className="text-sm text-gray-600 mb-2">{d.description}</p>
            {d.stats && (
              <p className="text-sm text-gray-500 mb-3">📊 {d.stats}</p>
            )}
            <div className="flex gap-2">
              <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                Download Template
              </Button>
              <Button className="bg-green-600 text-white hover:bg-green-700">
                Upload Data
              </Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                View
              </Button>
            </div>
          </div>
        ))}

        {/* Other datasets card */}
        <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Other Datasets</h3>
            </div>
            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
              Flexible
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Additional country-specific datasets that extend the baseline.
          </p>
          {otherDatasets.length === 0 ? (
            <p className="italic text-gray-500">No extra datasets added yet.</p>
          ) : (
            <ul className="list-disc pl-6 text-sm text-gray-700 mb-4">
              {otherDatasets.map((ds) => (
                <li key={ds.key}>
                  <strong>{ds.title}</strong> – {ds.description} (
                  {statusBadge(ds.status)})
                </li>
              ))}
            </ul>
          )}
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">
            Add Dataset
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
