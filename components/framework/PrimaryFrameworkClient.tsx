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
  const [editMode, setEditMode] = useState(false); // 🔑 unified edit mode

  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

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

  // Stubbed actions for now
  const handleNew = () => console.log("New framework version (scratch)");
  const handleEdit = (id: string) => console.log("Edit version", id);
  const handleClone = (id: string) => console.log("Clone version", id);
  const handleDelete = (id: string) => console.log("Delete version", id);
  const handlePublish = (id: string) => console.log("Publish version", id);

  return (
    <div>
      {/* Edit mode toggle (applies to versions + framework editor) */}
      <div className="flex justify-end mb-3">
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

      {/* Versions panel */}
      <VersionManager
        versions={versions}
        selectedId={currentId}
        editMode={editMode} // 🔑 pass down
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onPublish={handlePublish}
      />

      {/* Framework tree editor */}
      {loading ? (
        <div className="text-gray-500 text-sm mt-3">Loading...</div>
      ) : (
        <FrameworkEditor
          tree={tree}
          versionId={currentId}
          editMode={editMode} // 🔑 pass down
          onChanged={() => loadTree(currentId)}
        />
      )}
    </div>
  );
}
