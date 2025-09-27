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
  const [selectedId, setSelectedId] = useState(openedId ?? "");
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = groupThemes["ssc-config"];

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
    <div>
      {/* Version Selector + Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="version" className="text-sm font-medium text-gray-700">
            Select Version:
          </label>
          <select
            id="version"
            name="version"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
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

        {selectedId && (
          <div className="flex gap-3">
            <button
              className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
              onClick={() => window.location.reload()}
            >
              Open Version
            </button>
            <button className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
              Clone
            </button>
            <button className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
              Publish
            </button>
          </div>
        )}
      </div>

      {/* Framework Tree */}
      <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
        {!selectedId && (
          <div className="text-sm text-gray-600">
            Select a version and click “Open Version”.
          </div>
        )}

        {selectedId && loading && (
          <div className="text-sm text-gray-600">Loading framework tree…</div>
        )}

        {selectedId && error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        {selectedId && tree && <FrameworkEditor tree={tree} />}
      </div>
    </div>
  );
}
