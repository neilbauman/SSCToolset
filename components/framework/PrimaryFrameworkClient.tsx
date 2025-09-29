"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
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
  const [editMode, setEditMode] = useState(true);

  // keep versions list in state so UI updates immediately
  const [localVersions, setLocalVersions] = useState<FrameworkVersion[]>(versions);

  // sync when parent provides openedId
  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

  // load tree for a version
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

  // refresh versions from DB
  const refreshVersions = async () => {
    const { data, error } = await supabaseBrowser
      .from("framework_versions")
      .select("id, name, status, created_at, updated_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error refreshing versions:", error.message);
    } else {
      setLocalVersions(data ?? []);
    }
  };

  // ────────────────────────────────
  // Handlers for version actions
  // ────────────────────────────────
  const handleNew = async (name: string) => {
    try {
      const { data, error } = await supabaseBrowser
        .from("framework_versions")
        .insert({ name, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      await refreshVersions();
      if (data?.id) setCurrentId(data.id);
    } catch (err: any) {
      console.error("Error creating new version:", err.message);
    }
  };

  const handleEdit = (id: string) => {
    console.log("Edit version", id);
    // TODO: modal → update name/metadata
  };

  const handleClone = async (id: string) => {
    try {
      const { data, error } = await supabaseBrowser.rpc("clone_framework_version", {
        v_from_version_id: id,
        v_new_name: `Clone of ${id}`,
      });
      if (error) throw error;
      await refreshVersions();
      if (data) setCurrentId(data);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabaseBrowser
        .from("framework_versions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await refreshVersions();
      // if deleted current, reset to first
      if (id === currentId && localVersions.length > 0) {
        setCurrentId(localVersions[0].id);
      }
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const { error } = await supabaseBrowser
        .from("framework_versions")
        .update({ status: "published" })
        .eq("id", id);
      if (error) throw error;
      await refreshVersions();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  };

  // ────────────────────────────────

  return (
    <div>
      <VersionManager
        versions={localVersions}
        selectedId={currentId}
        editMode={editMode}
        onSelect={(id) => setCurrentId(id)}
        onNew={handleNew}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onPublish={handlePublish}
      />

      <div className="flex justify-end mb-2 text-sm text-gray-500">
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="hover:text-gray-700"
          >
            Exit edit mode
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="hover:text-gray-700"
          >
            Enter edit mode
          </button>
        )}
      </div>

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
