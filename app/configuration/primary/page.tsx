// app/configuration/primary/page.tsx
"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

interface Version {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function PrimaryFrameworkPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    async function loadVersions() {
      const { data, error } = await supabaseBrowser
        .from("framework_versions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading versions:", error);
      } else {
        setVersions(data || []);
      }
    }
    loadVersions();
  }, []);

  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="SSC Configuration"
        subtitle="Create and manage framework versions based on the catalogues"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework Editor" },
            ]}
          />
        }
      />

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Framework Versions</h2>
        <ul className="border rounded-md divide-y">
          {versions.map((v) => (
            <li
              key={v.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                selectedVersion?.id === v.id ? "bg-gray-100 font-semibold" : ""
              }`}
              onClick={() => setSelectedVersion(v)}
            >
              {v.name} <span className="text-sm text-gray-500">({v.status})</span>
            </li>
          ))}
        </ul>
      </div>

      {selectedVersion && (
        <div className="mt-6">
          {/* ✅ Pass versionId instead of full object */}
          <FrameworkEditor versionId={selectedVersion.id} />
        </div>
      )}
    </div>
  );
}
