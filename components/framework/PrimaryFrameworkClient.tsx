"use client";

import React, { useEffect, useState } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  publishVersion,
  deletePillar,
  updateVersion,
} from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import VersionManager from "./VersionManager";
import FrameworkEditor from "./FrameworkEditor";
import { getVersionTree } from "@/lib/services/framework";

export default function PrimaryFrameworkClient() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // load versions
  const refreshVersions = async () => {
    const data = await listVersions();
    setVersions(data);
    if (!currentId && data.length > 0) {
      setCurrentId(data[0].id);
    }
  };

  useEffect(() => {
    refreshVersions();
  }, []);

  // load tree for selected version
  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // ─────────────────────────────
  // Handlers
  // ─────────────────────────────
  const handleNew = async (name: string) => {
    const v = await createVersion(name || "Untitled Framework");
    await refreshVersions();
    setCurrentId(v.id);
  };

  const handleEdit = (id: string) => {
    console.log("Edit version", id);
  };

  const handleClone = async (id: string) => {
    const newName = prompt("Enter name for cloned version") || "Cloned Version";
    await cloneVersion(id, newName);
    await refreshVersions();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this version?")) {
      await deletePillar(id); // ⚠️ temporary until deleteVersion exists
      await refreshVersions();
    }
  };

  const handlePublish = async (id: string) => {
    await publishVersion(id);
    await refreshVersions();
  };

  return (
    <div className="space-y-4">
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

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        currentId && (
          <FrameworkEditor
            tree={tree}
            versionId={currentId}
            editMode={editMode}
            onChanged={() => loadTree(currentId)}
          />
        )
      )}

      <div className="pt-4">
        <button
          className="text-sm text-blue-600 underline"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>
    </div>
  );
}
