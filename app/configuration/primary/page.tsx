"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

type Version = {
  id: string;
  name: string;
  created_at: string;
};

export default function PrimaryFrameworkPage() {
  const [versions] = useState<Version[]>([
    {
      id: "823751b3-b877-48fa-8f60-6e2a5513f9d5",
      name: "Primary Framework v1",
      created_at: "2025-09-26T07:21:07.000Z",
    },
  ]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  return (
    <div className="p-6">
      <PageHeader
        title="Primary Framework Editor"
        group="SSC Configuration"
        subtitle="Define and manage pillars, themes, and subthemes of the SSC framework."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework" },
            ]}
          />
        }
      />

      {/* Versions List */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <h2 className="text-md font-semibold mb-4">Available Versions</h2>
        <ul className="divide-y divide-gray-200">
          {versions.map((version) => (
            <li
              key={version.id}
              className="py-2 cursor-pointer text-blue-600 hover:underline"
              onClick={() => setSelectedVersion(version)}
            >
              {version.name}
              <span className="ml-4 text-sm text-gray-500">
                {new Date(version.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Version Editor */}
      {selectedVersion && (
        <div className="mt-6">
          <FrameworkEditor version={selectedVersion} />
        </div>
      )}
    </div>
  );
}
