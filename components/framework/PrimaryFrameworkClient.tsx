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
  const [editMode, setEditMode] = useState(false);

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

  const createdAt = selectedVersion?.created_at
    ? new Date(selectedVersion.created_at).toLocaleDateString()
    : "Unknown";

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      {!openedId && (
        <div className="text-sm text-gray-600">
          Select a version and click “Open Version”.
        </div>
      )}

      {openedId && loading && (
        <div className="text-sm text-gray-600">Loading framework tree…</div>
      )}

      {openedId && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {openedId && selectedVersion && (
        <div className="mb-4 text-sm text-gray-700">
          <div><strong>Name:</strong> {selectedVersion.name}</div>
          <div><strong>Status:</strong> {selectedVersion.status}</div>
          <div><strong>Created:</strong> {createdAt}</div>
        </div>
      )}

      {openedId && tree && (
        <FrameworkEditor tree={tree} editMode={editMode} setEditMode={setEditMode} />
      )}
    </div>
  );
}
