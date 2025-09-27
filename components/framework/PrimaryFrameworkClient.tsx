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
      {!openedId && (
        <div className="text-sm text-gray-600">
          Select a version and click “Open Version”.
        </div>
      )}

      {openedId && selectedVersion && (
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
