"use client";

import { useState, useEffect } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  publishVersion,
  updateVersion,
  deleteVersion,
  getVersionTree,
} from "@/lib/services/framework";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import CloneVersionModal from "./CloneVersionModal";

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
  const [allVersions, setAllVersions] = useState<FrameworkVersion[]>(versions);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);

  // keep in sync when parent provides openedId
  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

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

  const refreshVersions = async () => {
    try {
      const v = await listVersions();
      setAllVersions(v);
    } catch (err: any) {
      console.error("Error refreshing versions:", err.message);
    }
  };

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  // ──────────────── Actions ────────────────
  const handleNew = async (name: string) => {
    try {
      const v = await createVersion(name);
      await refreshVersions();
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleEdit = async (id: string, name: string) => {
    try {
      await updateVersion(id, { name });
      await refreshVersions();
    } catch (err: any) {
      console.error("Error editing version:", err.message);
    }
  };

  const handleClone = (id: string) => {
    setCloneSourceId(id);
    setCloneModalOpen(true);
  };

  const confirmClone = async (newName: string) => {
    if (!cloneSourceId) return;
    try {
      const vId = await cloneVersion(cloneSourceId, newName);
      await refreshVersions();
      setCurrentId(vId);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    } finally {
      setCloneModalOpen(false);
      setCloneSourceId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion(id);
      await refreshVersions();
      if (currentId === id && allVersions.length > 0) {
        setCurrentId(allVersions[0].id);
      }
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishVersion(id);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Framework Versions</h2>
        <button
          className="text-sm text-gray-600 hover:text-gray-800"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      {/* Version list */}
      <VersionManager
        versions={allVersions}
        selectedId={currentId}
        editMode={editMode}
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onPublish={handlePublish}
      />

      {/* Framework editor */}
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

      {/* Clone modal */}
      {cloneModalOpen && (
        <CloneVersionModal
          onClose={() => setCloneModalOpen(false)}
          onConfirm={confirmClone}
        />
      )}
    </div>
  );
}
