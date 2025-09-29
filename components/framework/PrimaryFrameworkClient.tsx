"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string; // optional initial version
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(
    openedId ?? versions[0]?.id ?? ""
  );
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Sync when parent provides openedId
  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

  // Load tree for a version
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

  // ─────────────────────────────────────────────
  // Handlers for version actions (stubs for now)
  // ─────────────────────────────────────────────
  const handleNew = () => console.log("New framework version");
  const handleEdit = (id: string) => console.log("Edit version", id);
  const handleClone = (id: string) => console.log("Clone version", id);
  const handleDelete = (id: string) => console.log("Delete version", id);
  const handlePublish = (id: string) => console.log("Publish version", id);

  return (
    <div>
      {/* Toggle edit mode */}
      <div className="flex justify-end mb-2">
        {editMode ? (
          <button
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setEditMode(false)}
          >
            Exit edit mode
          </button>
        ) : (
          <button
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setEditMode(true)}
          >
            Enter edit mode
          </button>
        )}
      </div>

      {/* Version Manager */}
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

      {/* Framework Editor */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <FrameworkEditor
          tree={tree}
          versionId={currentId}
          editMode={editMode}
          onChanged={() => loadTree(currentId)}
        />
      )}
    </div>
  );
}
