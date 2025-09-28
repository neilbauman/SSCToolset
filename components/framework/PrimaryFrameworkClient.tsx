"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getVersionTree } from "@/lib/services/framework";
import type {
  FrameworkVersion,
  NormalizedFramework,
} from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";
import { Copy, Trash2, Upload } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(openedId);
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const theme = groupThemes["ssc-config"];

  useEffect(() => setSelectedId(openedId), [openedId]);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedId),
    [versions, selectedId]
  );

  const loadTree = useCallback(async () => {
    if (!selectedId) {
      setTree(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const t = await getVersionTree(selectedId);
      setTree(t);
    } catch (e) {
      console.error(e);
      setError("Failed to load framework tree.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const onOpen = () => {
    if (selectedId) {
      window.location.href = `/configuration/primary?version=${selectedId}`;
    } else {
      window.location.href = `/configuration/primary`;
    }
  };

  const createdAt = useMemo(() => {
    if (!selectedVersion?.created_at) return "";
    try {
      return new Date(selectedVersion.created_at).toLocaleDateString();
    } catch {
      return String(selectedVersion.created_at);
    }
  }, [selectedVersion]);

  const isPublished = selectedVersion?.status === "published";

  return (
    <div className={`rounded-lg bg-white shadow-sm p-6 ${theme.border}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>

        <select
          id="version"
          name="version"
          value={selectedId ?? ""}
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

        <button
          onClick={onOpen}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
        >
          Open Version
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            title="Clone version (not wired)"
          >
            <Copy className="h-4 w-4" />
            Clone
          </button>

          <button
            className={`inline-flex items-center gap-1 rounded border px-3 py-1 text-sm ${
              isPublished
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
            disabled={isPublished}
            title={isPublished ? "Already published" : "Publish (not wired)"}
          >
            <Upload className="h-4 w-4" />
            Publish
          </button>

          <button
            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            title="Delete version (not wired)"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {selectedVersion && (
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status: </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                isPublished
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              {selectedVersion.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created: </span>
            <span className="text-gray-800">{createdAt || "—"}</span>
          </div>
          <div className="truncate">
            <span className="text-gray-500">Name: </span>
            <span className="text-gray-800">{selectedVersion.name}</span>
          </div>

          <div className="ml-auto">
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`rounded px-3 py-1 text-sm ring-1 ${
                editMode
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-gray-900 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
            </button>
          </div>
        </div>
      )}

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
      {selectedId && tree && (
        <FrameworkEditor tree={tree} editMode={editMode} />
      )}
    </div>
  );
}
