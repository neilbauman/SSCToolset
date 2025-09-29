"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import {
  createVersion,
  cloneVersion,
  publishVersion,
  updateVersion,
} from "@/lib/services/framework";
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
  const [allVersions, setAllVersions] = useState<FrameworkVersion[]>(versions);

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
    const { data, error } = await supabaseBrowser.rpc("get_framework_tree", {
      v_version_id: versionId,
    });
    if (error) {
      console.error("Error loading framework tree:", error.message);
    } else {
      setTree(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  // Refresh versions list after mutations
  const refreshVersions = async () => {
    const { data, error } = await supabaseBrowser
      .from("framework_versions")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error refreshing versions:", error.message);
    } else {
      setAllVersions(data ?? []);
    }
  };

  // ─────────────────────────────────────────────
  // Handlers for version actions
  // ─────────────────────────────────────────────
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
      const v = await updateVersion(id, { name });
      await refreshVersions();
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error editing version:", err.message);
    }
  };

  const handleClone = async (fromId: string) => {
    try {
      const newId = await cloneVersion(fromId, "Cloned Version");
      await refreshVersions();
      setCurrentId(newId);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/framework/versions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete version");
      await refreshVersions();
      if (id === currentId) {
        setCurrentId(allVersions[0]?.id ?? "");
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

  // ─────────────────────────────────────────────

  return (
    <div className="flex space-x-4">
      {/* Left column: Versions Manager */}
      <div className="w-1/3">
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
        <div className="mt-2 text-sm text-gray-500">
          {editMode ? (
            <button
              className="hover:text-gray-700"
              onClick={() => setEditMode(false)}
            >
              Exit edit mode
            </button>
          ) : (
            <button
              className="hover:text-gray-700"
              onClick={() => setEditMode(true)}
            >
              Enter edit mode
            </button>
          )}
        </div>
      </div>

      {/* Right column: Framework editor */}
      <div className="flex-1">
        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : (
          <FrameworkEditor
            tree={tree}
            versionId={currentId}
            onChanged={() => loadTree(currentId)}
          />
        )}
      </div>
    </div>
  );
}
