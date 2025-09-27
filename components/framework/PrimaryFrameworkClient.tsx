"use client";

import { useEffect, useState } from "react";
import { getVersionTree } from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(openedId);

  const theme = groupThemes["ssc-config"];
  const selectedVersion = versions.find((v) => v.id === selectedId);

  // Load tree when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setTree(null);
      return;
    }
    setLoading(true);
    setError(null);

    getVersionTree(selectedId)
      .then((res) => setTree(res))
      .catch((e) => {
        console.error("Failed to load framework tree", e);
        setError("Failed to load framework tree.");
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      {/* Dropdown + buttons */}
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          value={selectedId ?? ""}
          onChange={(e) => {
            const id = e.target.value || undefined;
            setSelectedId(id);
            window.history.pushState(
              {},
              "",
              id ? `/configuration/primary?version=${id}` : `/configuration/primary`
            );
          }}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">-- Select a version --</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.status === "draft" ? "(Draft)" : "(Published)"}
            </option>
          ))}
        </select>

        <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
          Open Version
        </button>
        <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
          Clone
        </button>
        <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
          Publish
        </button>
      </div>

      {/* Metadata */}
      {selectedVersion && (
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span
            className={`px-2 py-0.5 rounded ${
              selectedVersion.status === "draft"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {selectedVersion.status}
          </span>
          <span>
            Created:{" "}
            {new Date(selectedVersion.created_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Framework Editor */}
      {selectedId && loading && (
        <div className="text-sm text-gray-600">Loading framework tree…</div>
      )}
      {selectedId && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      {selectedId && tree && <FrameworkEditor tree={tree} />}
    </div>
  );
}
