"use client";

import { useState } from "react";
import { groupThemes } from "@/lib/theme";
import type { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "@/components/framework/FrameworkEditor";

type Props = { versions: FrameworkVersion[] };

export default function PrimaryFrameworkClient({ versions }: Props) {
  const theme = groupThemes["ssc-config"];
  const [pendingSelectedId, setPendingSelectedId] = useState<string>(versions[0]?.id ?? "");
  const pendingSelected = versions.find((v) => v.id === pendingSelectedId) || null;
  const [openedId, setOpenedId] = useState<string | null>(null);

  return (
    <>
      {/* Selector */}
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          value={pendingSelectedId}
          onChange={(e) => setPendingSelectedId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setOpenedId(pendingSelectedId)}
          disabled={!pendingSelected}
          className={`px-4 py-2 rounded text-sm ${theme.border} ${theme.text} ${theme.hover}`}
        >
          Open Version
        </button>
      </div>

      {/* Metadata */}
      {pendingSelected && (
        <div className="mt-2 text-sm text-gray-700">
          <span
            className={`px-2 py-1 mr-2 text-xs rounded ${
              pendingSelected.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {pendingSelected.status === "published" ? "Published" : "Draft"}
          </span>
          Created:{" "}
          {new Date(pendingSelected.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      )}

      {/* Actions */}
      {openedId && (
        <div className="mt-4 flex justify-end gap-2">
          <button className={`px-4 py-2 rounded border text-sm ${theme.border} ${theme.text} ${theme.hover}`}>
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
        {openedId ? (
          <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
            <FrameworkEditor versionId={openedId} />
          </div>
        ) : (
          <div className="text-sm text-gray-600">Select a version and click “Open Version”.</div>
        )}
      </div>
    </>
  );
}
