// components/framework/PrimaryFrameworkClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  listVersions,
  createVersion,
  updateVersion,
  cloneVersion,
  deleteVersion,
  publishVersion,
  getVersionTree,
} from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import CloneVersionModal from "./CloneVersionModal";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions: initialVersions, openedId }: Props) {
  const [versions, setVersions] = useState<FrameworkVersion[]>(initialVersions || []);
  const [currentId, setCurrentId] = useState<string | undefined>(openedId);
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneFromId, setCloneFromId] = useState<string | null>(null);

  // Load tree when version changes
  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  async function refreshVersions() {
    const list = await listVersions();
    setVersions(list);
    if (!currentId && list.length > 0) {
      setCurrentId(list[list.length - 1].id);
    }
  }

  async function loadTree(versionId: string) {
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleNew(name: string) {
    const v = await createVersion(name);
    await refreshVersions();
    setCurrentId(v.id);
  }

  async function handleEdit(id: string, name: string) {
    await updateVersion(id, { name }); // ✅ fix
    await refreshVersions();
  }

  async function handleClone(id: string, name: string) {
    const newId = await cloneVersion(id, name);
    await refreshVersions();
    setCurrentId(newId);
  }

  async function handleDelete(id: string) {
    await deleteVersion(id);
    await refreshVersions();
    if (currentId === id) {
      setCurrentId(undefined);
      setTree([]);
    }
  }

  async function handlePublish(id: string, publish: boolean) {
    await publishVersion(id, publish);
    await refreshVersions();
  }

  return (
    <div className="space-y-4">
      {/* Versioning table */}
      <VersionManager
        versions={versions}
        selectedId={currentId}
        editMode={editMode}
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}
        onEdit={handleEdit}
        onClone={(id) => {
          setCloneFromId(id);
          setCloneModalOpen(true);
        }}
        onDelete={handleDelete}
        onPublish={handlePublish}
      />

      {/* Toggle edit mode */}
      <div className="flex justify-end">
        <button
          onClick={() => setEditMode((e) => !e)}
          className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Framework editor */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : currentId ? (
        <FrameworkEditor
          tree={tree}
          versionId={currentId}
          editMode={editMode}
          onChanged={() => loadTree(currentId)}
        />
      ) : (
        <div className="text-gray-500 text-sm">No version selected</div>
      )}

      {/* Clone modal */}
      {cloneModalOpen && cloneFromId && (
        <CloneVersionModal
          onClose={() => setCloneModalOpen(false)}
          onConfirm={async (name: string) => {
            await handleClone(cloneFromId, name);
            setCloneModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
