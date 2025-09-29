"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import {
  listVersions,
  createVersion,
  cloneVersion,
  updateVersion,
  publishVersion,
  deleteVersion,
  getVersionTree,
} from "@/lib/services/framework";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(
    openedId ?? versions[0]?.id ?? ""
  );
  const [versionList, setVersionList] = useState<FrameworkVersion[]>(versions);
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  async function refreshVersions(): Promise<FrameworkVersion[]> {
    const vs = await listVersions();
    setVersionList(vs);
    return vs;
  }

  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data ?? []);
    } catch (err: any) {
      console.error("Error loading framework tree:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // Handlers
  async function handleNew(name: string): Promise<void> {
    try {
      const v = await createVersion(name);
      setCurrentId(v.id);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error creating new version:", err.message);
    }
  }

  async function handleEdit(id: string, patch: { name?: string }): Promise<void> {
    try {
      await updateVersion(id, patch);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error editing version:", err.message);
    }
  }

  async function handleClone(id: string, newName: string): Promise<void> {
    try {
      const newId = await cloneVersion(id, newName);
      setCurrentId(newId);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteVersion(id);
      const vs = await refreshVersions();
      setCurrentId(vs[0]?.id ?? "");
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  }

  async function handlePublish(id: string, publish: boolean): Promise<void> {
    try {
      await publishVersion(id, publish);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  }

  return (
    <div>
      <VersionManager
        versions={versionList}
        selectedId={currentId}
        editMode={editMode}
        onToggleEdit={() => setEditMode(!editMode)}
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onPublish={handlePublish}
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
