"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { getVersionTree, createVersion } from "@/lib/services/framework";

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
  const [localVersions, setLocalVersions] = useState<FrameworkVersion[]>(versions);
  const [editMode, setEditMode] = useState(false);

  // Sync when parent provides openedId
  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

  // Load tree for a version
  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data ?? []);
    } catch (err: any) {
      console.error("Error loading framework tree:", err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  // ─────────────────────────────────────────────────────────────
  // Handlers for version actions
  // ─────────────────────────────────────────────────────────────
  const handleNew = async () => {
    try {
      const v = await createVersion("Untitled Framework");
      setLocalVersions([...localVersions, v]);
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error creating new version:", err.message);
    }
  };

  const handleEdit = (id: string) => {
    console.log("Edit version", id);
  };

  const handleClone = (id: string) => {
    console.log("Clone version", id);
  };

  const handleDelete = (id: string) => {
    console.log("Delete version", id);
  };

  const handlePublish = (id: string) => {
    console.log("Publish version", id);
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <div>
      <VersionManager
        versions={localVersions}
        selectedId={currentId}
        editMode={editMode}
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}   // 🔑 fully wired
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onPublish={handlePublish}
        onToggleEdit={() => setEditMode((e) => !e)}
      />

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
