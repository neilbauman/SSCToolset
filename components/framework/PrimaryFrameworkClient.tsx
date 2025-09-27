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

  useEffect(() => {
    if (!selectedId) {
      setTree(null);
      return;
    }

    setLoading(true);
    setError(null);

    getVersionTree(selectedId)
      .then((res) => {
        setTree(res);
      })
      .catch((e) => {
        console.error("Failed to load framework tree", e);
        setError("Failed to load framework tree.");
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div>
      {/* Version actions row */}
      {selectedId && (
        <div className="mb-4 flex justify-between items-center">
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
        </div>
      )}

      {/* Framework display */}
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
