"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FrameworkEditor from "@/components/framework/FrameworkEditor";
import { listVersions } from "@/lib/services/framework";
import { groupThemes } from "@/lib/theme";

type FrameworkVersion = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

export default function PrimaryFrameworkPage() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [selected, setSelected] = useState<FrameworkVersion | null>(null);
  const theme = groupThemes["ssc-config"];

  useEffect(() => {
    async function load() {
      const v = await listVersions();
      setVersions(v || []);
      if (v && v.length > 0) {
        setSelected(v[0]); // default to first version
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        group="ssc-config"
        tool="Primary Framework Editor"
        description="Manage framework versions created from the SSC catalogue."
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

      {/* Version Selector */}
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          value={selected?.id || ""}
          onChange={(e) =>
            setSelected(versions.find((v) => v.id === e.target.value) || null)
          }
          className="rounded border px-3 py-2 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>

        {selected && (
          <span
            className={`px-2 py-1 text-xs rounded ${
              selected.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {selected.status === "published" ? "Published" : "Draft"}
          </span>
        )}
      </div>

      {/* Actions */}
      {selected && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            className={`px-4 py-2 rounded border text-sm ${theme.border} ${theme.text} ${theme.hover}`}
          >
            Duplicate from Catalogue
          </button>
          <button
            className={`px-4 py-2 rounded text-sm text-white ${theme.text} ${theme.hover} bg-[color:var(--gsc-blue)] hover:bg-blue-900`}
          >
            Publish
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="mt-6">
        {selected ? (
          <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
            <FrameworkEditor versionId={selected.id} />
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            No framework versions found.
          </div>
        )}
      </div>
    </div>
  );
}
