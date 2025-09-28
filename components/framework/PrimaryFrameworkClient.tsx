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

  const theme = groupThemes["ssc-config"];
  const selectedVersion = versions.find((v) => v.id === openedId);

  useEffect(() => {
    if (!openedId) {
      setTree(null);
      return;
    }

    setLoading(true);
    setError(null);

    getVersionTree(openedId)
      .then((res) => {
        setTree(res);
      })
      .catch((e) => {
        console.error("Failed to load framework tree", e);
        setError("Failed to load framework tree.");
      })
      .finally(() => setLoading(false));
  }, [openedId]);

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      {/* Version controls */}
      <div className="mb-6 border-b pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Version selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="version" className="text-sm font-medium text-gray-700">
              Select Version:
            </label>
            <select
              id="version"
              name="version"
              defaultValue={openedId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  window.location.href = `/configuration/primary?version=${id}`;
                } else {
                  window.location.href = `/configuration/primary`;
                }
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
          </div>

          {/* Status + metadata */}
          {selectedVersion && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedVersion.status === "draft"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {selectedVersion.status === "draft" ? "Draft" : "Published"}
              </span>
              <span>{selectedVersion.created_at?.slice(0, 10)}</span>
            </div>
          )}

          {/* Action buttons */}
          {selectedVersion && (
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">
                Open Version
              </button>
              <button className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">
                Clone
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${
                  selectedVersion.status === "published"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                disabled={selectedVersion.status === "published"}
              >
                Publish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Framework section */}
      {!openedId && (
        <div className="text-sm text-gray-600">Select a version to view its framework.</div>
      )}

      {openedId && loading && (
        <div className="text-sm text-gray-600">Loading framework tree…</div>
      )}

      {openedId && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {openedId && tree && <FrameworkEditor tree={tree} />}
    </div>
  );
}
