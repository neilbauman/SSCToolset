"use client";

import React, { useEffect, useMemo, useState } from "react";
import FrameworkEditor from "./FrameworkEditor";
import { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import { BadgeCheck, Copy, CheckCircle, Loader2 } from "lucide-react";

/**
 * Props: page.tsx can continue to pass versions + openedId.
 * PrimaryFrameworkClient owns: version dropdown, status badge, created date,
 * and the Open Version / Clone / Publish buttons.
 */
type Props = {
  versions: FrameworkVersion[];
  openedId: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(openedId);
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyBtn, setBusyBtn] = useState<"open" | "clone" | "publish" | null>(
    null
  );

  useEffect(() => {
    // load initial tree for openedId on first mount
    if (openedId) void loadTree(openedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = useMemo(
    () => versions.find((v) => v.id === currentId),
    [versions, currentId]
  );

  async function loadTree(versionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/framework/tree?version=${versionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Tree load failed (${res.status})`);
      const data = (await res.json()) as NormalizedFramework[];
      setTree(data ?? []);
    } catch (err) {
      console.error(err);
      alert("Failed to load framework tree.");
      setTree([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    setBusyBtn("open");
    await loadTree(currentId);
    setBusyBtn(null);
  }

  async function handleClone() {
    // UI only for now — wire to API later.
    setBusyBtn("clone");
    try {
      const from = versions.find((v) => v.id === currentId);
      const suggested = from ? `${from.name} (Copy)` : "New Draft";
      const name = window.prompt("Name for cloned draft:", suggested || "Copy");
      if (!name) return;

      // Try POST /api/framework/versions/clone if present; otherwise no-op UI.
      const res = await fetch("/api/framework/versions/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromVersionId: currentId, name }),
      });

      if (res.ok) {
        // safe to refetch list of versions
        const refreshed = await fetch("/api/framework/versions", {
          cache: "no-store",
        });
        if (refreshed.ok) {
          const next = (await refreshed.json()) as FrameworkVersion[];
          // Pick newest draft by created_at if present, else the last item
          const draft =
            next.find((v) => v.status === "draft") ?? next[next.length - 1];
          if (draft) {
            setCurrentId(draft.id);
            await loadTree(draft.id);
          }
        }
      } else {
        // If the route doesn't exist yet, just message the user (no crash).
        alert("Clone API not wired yet. UI confirmed.");
      }
    } catch (e) {
      console.error(e);
      alert("Unable to clone version.");
    } finally {
      setBusyBtn(null);
    }
  }

  async function handlePublish() {
    if (!current || current.status === "published") return;
    setBusyBtn("publish");
    try {
      // Try POST /api/framework/versions/publish if present; otherwise no-op UI.
      const res = await fetch("/api/framework/versions/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: current.id }),
      });
      if (res.ok) {
        alert("Published! (If not reflected, the publish API is not wired yet.)");
      } else {
        alert("Publish API not wired yet. UI confirmed.");
      }
    } catch (e) {
      console.error(e);
      alert("Unable to publish version.");
    } finally {
      setBusyBtn(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header strip: dropdown + metadata + version actions */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border px-3 py-3 bg-white">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="version" className="text-sm text-gray-600">
              Select Version:
            </label>
            <select
              id="version"
              value={currentId}
              onChange={(e) => setCurrentId(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.status === "published" ? "Published" : "Draft"})
                </option>
              ))}
            </select>
          </div>

          {current && (
            <>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                  current.status === "published"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
                title={current.status}
              >
                {current.status === "published" ? (
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                )}
                {current.status.charAt(0).toUpperCase() + current.status.slice(1)}
              </span>
              <span className="text-xs text-gray-500">
                Version ID: {current.id}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpen}
            disabled={busyBtn === "open"}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Open the selected version"
          >
            {busyBtn === "open" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…
              </span>
            ) : (
              "Open Version"
            )}
          </button>

          <button
            onClick={handleClone}
            disabled={!current || busyBtn === "clone"}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Clone this version as a draft"
          >
            <Copy className="h-3.5 w-3.5" />
            Clone
          </button>

          <button
            onClick={handlePublish}
            disabled={!current || current.status === "published" || busyBtn === "publish"}
            className="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            title="Publish this version"
          >
            {busyBtn === "publish" ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Body: tree editor */}
      <div className="rounded-md border bg-white">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : tree ? (
          <div className="p-3">
            <FrameworkEditor
              tree={tree}
              versionId={currentId}
              onChanged={async () => {
                // refresh after a mutation inside the editor
                await loadTree(currentId);
              }}
              onAddPillar={() => {
                // The FrameworkEditor owns the "Add Pillar" modal flow.
                // We just keep this callback for future wiring if needed.
              }}
            />
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-600">Choose a version and click “Open Version”.</div>
        )}
      </div>
    </div>
  );
}
