"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

export default function PrimaryFrameworkPage() {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);

  // Load versions when page loads
  useState(() => {
    const loadVersions = async () => {
      const { data, error } = await supabaseBrowser
        .from("framework_versions")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) setVersions(data);
    };
    loadVersions();
  });

  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="SSC Configuration"
        subtitle="Define and manage pillars, themes, and subthemes of the SSC framework."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework" },
            ]}
          />
        }
      />

      <div className="mt-6 space-y-4">
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="mb-2 font-semibold">Available Versions</h2>
          <ul className="divide-y">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex items-center justify-between py-2"
              >
                <button
                  className={`text-blue-600 hover:underline ${
                    selectedVersion?.id === version.id
                      ? "font-bold"
                      : "font-normal"
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  {version.name}
                </button>
                <span className="text-sm text-gray-500">
                  {new Date(version.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {selectedVersion && (
          <div className="mt-6">
            <FrameworkEditor versionId={selectedVersion.id} />
          </div>
        )}
      </div>
    </div>
  );
}
