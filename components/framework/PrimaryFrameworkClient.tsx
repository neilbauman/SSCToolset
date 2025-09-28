// components/framework/PrimaryFrameworkClient.tsx

"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { supabaseBrowser } from "@/lib/supabase";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string; // allow undefined
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(
    openedId ?? versions[0]?.id ?? ""
  );
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

  const loadTree = async (versionId: string) => {
    setLoading(true);
    const { data, error } = await supabaseBrowser.rpc("get_framework_tree", {
      v_version_id: versionId,
    });
    if (error) {
      console.error("Error loading framework tree:", error.message);
    } else {
      setTree(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentId(e.target.value);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {/* Version dropdown */}
        <select
          value={currentId}
          onChange={handleVersionChange}
          className="border rounded px-2 py-1 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>

        {/* Status badge */}
        <span
          className={`px-2 py-1 rounded text-xs ${
            versions.find((v) => v.id === currentId)?.status === "published"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {versions.find((v) => v.id === currentId)?.status}
        </span>

        {/* Version ID */}
        <span className="text-gray-500 text-xs">
          Version ID: {currentId || "—"}
        </span>

        {/* Framework versioning buttons */}
        <button className="ml-2 border rounded px-2 py-1 text-sm hover:bg-gray-100">
          New
        </button>
        <button className="border rounded px-2 py-1 text-sm hover:bg-gray-100">
          Edit
        </button>
        <button className="border rounded px-2 py-1 text-sm hover:bg-gray-100">
          Clone
        </button>
        <button className="border rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <FrameworkEditor
          tree={tree}
          versionId={currentId}
          onChanged={() => loadTree(currentId)}
        />
      )}
    </div>
  );
}
