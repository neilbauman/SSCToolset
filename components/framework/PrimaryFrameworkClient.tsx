"use client";

import { useState } from "react";
import type { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(openedId);

  const theme = groupThemes["ssc-config"];

  return (
    <div>
      {/* Version selector */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          defaultValue={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || undefined)}
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

      {/* Version actions */}
      {selectedId && (
        <div className="mb-4 flex gap-2">
          <button className="px-3 py-1 rounded border text-sm bg-gray-50 hover:bg-gray-100">
            Open Version
          </button>
          <button className="px-3 py-1 rounded border text-sm bg-gray-50 hover:bg-gray-100">
            Clone
          </button>
          <button className="px-3 py-1 rounded border text-sm bg-gray-50 hover:bg-gray-100">
            Publish
          </button>
        </div>
      )}

      {/* Framework tree */}
      <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
        {!selectedId && (
          <div className="text-sm text-gray-600">
            Select a version to open it.
          </div>
        )}

        {selectedId && <FrameworkEditor versionId={selectedId} />}
      </div>
    </div>
  );
}
