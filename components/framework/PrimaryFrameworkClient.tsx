"use client";

import React, { useState, useEffect } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  publishVersion,
  deleteVersion,
  updateVersion,
  getVersionTree,
} from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import VersionManager from "./VersionManager";
import FrameworkEditor from "./FrameworkEditor";

export default function PrimaryFrameworkClient() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ───────────────────────────────
  // Helpers
  // ───────────────────────────────
  const refreshVersions = async () => {
    const v = await listVersions();
    setVersions(v);
    if (!currentId && v.length > 0) setCurrentId(v[0].id);
  };

  const loadTree = async (versionId: string) => {
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data);
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────
  // Handlers
  // ───────────────────────────────
  const handleNew = async (name: string) => {
    await createVersion(name);
    await refreshVersions();
  };

  const handleEdit = async (id: string, name: string) => {
    await updateVersion(id, { name });
    await refreshVersions();
  };

  const handleClone = async (id: string, name: string) => {
    await cloneVersion(id, name);
    await refreshVersions();
  };

  const handleDelete = async (id: string) => {
    await deleteVersion(id);
    await refreshVersions();
  };

  const handlePublish = async (id: string) => {
    await publishVersion(id);
    await refreshVersions();
  };

  // ───────────────────────────────
  // Effects
  // ───────────────────────────────
  useEffect(() => {
    refreshVersions();
  }, []);

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // ───────────────────────────────
  // Render
  // ───────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Primary Framework Editor</h2>
        <button
          onClick={() => setEditMode((m) => !m)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

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
    </div>
  );
}
