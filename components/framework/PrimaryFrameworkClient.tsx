"use client";

import { useEffect, useState } from "react";
import { getVersionTree } from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";
import { format } from "date-fns";

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
      .then((res) => setTree(res))
      .catch((e) => {
        console.error("Failed to load framework tree", e);
        setError("Failed to load framework tree.");
      })
      .finally(() => setLoading(false));
  }, [openedId]);

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      {/* Show nothing until a version is chosen */}
      {!openedId && (
        <div className="text-sm text-gray-600">
          Select a version from the dropdown above.
        </div>
      )}

      {/* Metadata + actions */}
      {openedId && selectedVersion && (
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div>
            <div className="font-semibold text-gray-800">
              {selectedVersion.name}
            </div>
            <div className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={
                  selectedVersion.status === "draft"
                    ? "text-yellow-700 font-medium"
                    : "text-green-700 font-medium"
                }
              >
                {selectedVersion.status}
              </span>{" "}
              | Created:{" "}
              {selectedVersion.created_at
                ? format(new Date(selectedVersion.created_at), "PPP")
                : "Unknown"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              onClick={() =>
                (window.location.href = `/configuration/primary?version=${openedId}`)
              }
            >
              Open Version
            </button>
            <button className="rounded bg-blue-100 px-3 py-1 text-sm hover:bg-blue-200">
              Clone
            </button>
            <button
              className={`rounded px-3 py-1 text-sm ${
                selectedVersion.status === "published"
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-green-100 hover:bg-green-200"
              }`}
              disabled={selectedVersion.status === "published"}
            >
              Publish
            </button>
            <button className="rounded bg-red-100 px-3 py-1 text-sm hover:bg-red-200">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Framework tree */}
      {openedId && loading && (
        <div className="text-sm text-gray-600">Loading framework tree…</div>
      )}
      {openedId && error && <div className="text-sm text-red-600">{error}</div>}
      {openedId && tree && <FrameworkEditor tree={tree} />}
    </div>
  );
}
