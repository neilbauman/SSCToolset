"use client";

import React, { useEffect, useState } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  updateVersion,
  deleteVersion,
  publishVersion,
  getVersionTree,
} from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import VersionManager from "./VersionManager";
import FrameworkEditor from "./FrameworkEditor";
import CloneVersionModal from "./CloneVersionModal";

export default function PrimaryFrameworkClient() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneFromId, setCloneFromId] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Load versions
  // ─────────────────────────────────────────────
  async function refreshVersions() {
    const data = await listVersions();
    setVersions(data);
    if (!currentId && data.length > 0) {
      setCurrentId(data[data.length - 1].id); // select newest by default
    }
  }

  // ─────────────────────────────────────────────
  // Load framework tree
  // ─────────────────────────────────────────────
  async function loadTree(versionId: string) {
    if (!versionId) return;
    setLoading(true);
    try {
      const data = await getVersionTree(versionId);
      setTree(data);
    } catch (err: any) {
      console.error("Error loading framework tree:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshVersions();
  }, []);

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // ─────────────────────────────────────────────
  // Version actions
  // ─────────────────────────────────────────────
  async function handleNew() {
    try {
      const newName = `New Version ${new Date().toLocaleString()}`;
      const v = await createVersion(newName);
      await refreshVersions();
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  }

  async function handleEdit(id: string, name: string) {
    try {
      await updateVersion(id, name);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error editing version:", err.message);
    }
  }

  async function handleClone(id: string) {
    setCloneFromId(id);
    setCloneModalOpen(true);
  }

  async function confirmClone(newName: string) {
    if (!cloneFromId) return;
    try {
      const newId = await cloneVersion(cloneFromId, newName);
      await refreshVersions();
      setCurrentId(newId);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    } finally {
      setCloneModalOpen(false);
      setCloneFromId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVersion(id);
      await refreshVersions();
      if (currentId === id && versions.length > 0) {
        setCurrentId(versions[0].id);
      }
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  }

  async function handlePublish(id: string, makeDraft = false) {
    try {
      await publishVersion(id, makeDraft);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error publishing/unpublishing version:", err.message);
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Primary Framework</h2>
        <button
          onClick={() => setEditMode(!editMode)}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Versions table */}
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

      {/* Framework editor */}
      <div className="mt-6">
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
