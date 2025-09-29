"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(
    openedId ?? versions[0]?.id ?? ""
  );
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showVersions, setShowVersions] = useState<boolean>(true);

  // keep synced with parent
  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

  // load framework tree
  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    const { data, error } = await supabaseBrowser.rpc("get_framework_tree", {
      v_version_id: versionId,
    });
    if (error) console.error("Error loading framework tree:", error.message);
    else setTree(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // placeholder handlers
  const handleNew = async (name: string) => {
    console.log("New version:", name);
  };
  const handleEdit = (id: string) => console.log("Edit version", id);
  const handleClone = (id: string) => console.log("Clone version", id);
  const handleDelete = (id: string) => console.log("Delete version", id);
  const handlePublish = (id: string) => console.log("Publish version", id);

  return (
    <div className="w-full space-y-4">
      {/* Version manager with toggle */}
      <div className="bg-white border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Framework Versions
          </h2>
          <button
            onClick={() => setShowVersions((v) => !v)}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            {showVersions ? "Hide Versions" : "Show Versions"}
          </button>
        </div>

        {showVersions && (
          <VersionManager
            versions={versions}
            selectedId={currentId}
            editMode={editMode}
            onSelect={(id) => setCurrentId(id)}
            onNew={handleNew}
            onEdit={handleEdit}
            onClone={handleClone}
            onDelete={handleDelete}
            onPublish={handlePublish}
          />
        )}
      </div>

      {/* Edit mode toggle */}
      <div className="text-sm text-gray-500 flex justify-end">
        {editMode ? (
          <button
            className="hover:text-gray-700"
            onClick={() => setEditMode(false)}
          >
            Exit edit mode
          </button>
        ) : (
          <button
            className="hover:text-gray-700"
            onClick={() => setEditMode(true)}
          >
            Enter edit mode
          </button>
        )}
      </div>

      {/* Framework table */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <FrameworkEditor
          tree={tree}
          versionId={currentId}
          editMode={editMode} // ✅ always passed
          onChanged={() => loadTree(currentId)}
        />
      )}
    </div>
  );
}
