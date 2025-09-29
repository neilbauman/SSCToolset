"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";

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

  // Sync when parent provides openedId
  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const refreshVersions = async () => {
    try {
      const res = await fetch("/api/framework/versions");
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setAllVersions(data);
    } catch (err) {
      console.error("refreshVersions error:", err);
    }
  };

  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/framework/versions/${versionId}/tree`);
      if (!res.ok) throw new Error("Failed to fetch tree");
      const data = await res.json();
      setTree(data ?? []);
    } catch (err) {
      console.error("Error loading framework tree:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // ─────────────────────────────────────────────
  // Version action handlers
  // ─────────────────────────────────────────────
  const handleNew = async () => {
    const name = prompt("Enter name for new version:");
    if (!name) return;
    try {
      const res = await fetch("/api/framework/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create version");
      await refreshVersions();
    } catch (err) {
      console.error("Error creating version:", err);
    }
  };

  const handleEdit = async (id: string) => {
    alert(`TODO: implement edit modal for version ${id}`);
  };

  const handleClone = async (id: string) => {
    const newName = prompt("Enter name for cloned version:");
    if (!newName) return;
    try {
      const res = await fetch(`/api/framework/versions/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: id, newName }),
      });
      if (!res.ok) throw new Error("Failed to clone version");
      const newId = await res.json();
      await refreshVersions();
      setCurrentId(newId);
    } catch (err) {
      console.error("Error cloning version:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this version?")) return;
    try {
      const res = await fetch(`/api/framework/versions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete version");
      await refreshVersions();
      setCurrentId(allVersions[0]?.id ?? "");
    } catch (err) {
      console.error("Error deleting version:", err);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/framework/versions/${id}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to publish version");
      await refreshVersions();
    } catch (err) {
      console.error("Error publishing version:", err);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div>
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
        onToggleEdit={() => setEditMode((v) => !v)}
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
