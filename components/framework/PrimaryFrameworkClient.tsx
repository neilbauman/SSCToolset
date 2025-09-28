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

  useEffect(() => {
    if (!openedId) {
      setTree(null);
      return;
    }

    setLoading(true);
    setError(null);

    getVersionTree(openedId)
      .then((res) => setTree(res))
      .catch(() => setError("Failed to load framework tree."))
      .finally(() => setLoading(false));
  }, [openedId]);

  // Metadata for selected version
  const selected = versions.find((v) => v.id === openedId);

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      {/* Dropdown */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          name="version"
          defaultValue={openedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            window.location.href = id
              ? `/configuration/primary?version=${id}`
              : `/configuration/primary`;
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

        {selected && (
          <span className="ml-4 text-xs text-gray-500">
            {selected.status === "draft" ? "Draft" : "Published"} ·{" "}
            {new Date(selected.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* States */}
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

      {/* Framework editor */}
      {openedId && tree && (
        <FrameworkEditor
          tree={tree}
          editMode={editMode}
          setEditMode={setEditMode}
        />
      )}
    </div>
  );
}
