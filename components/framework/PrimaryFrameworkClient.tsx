"use client";

import { useEffect, useState } from "react";
import { getVersionTree } from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";

type Props = {
  versions: FrameworkVersion[];   // ✅ make sure this is here
  openedId?: string;              // ✅ and this too
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = groupThemes["ssc-config"];

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
          Select a version to view its framework.
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
