"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";
import {
  listVersions,
  createVersion,
  cloneVersion,
  publishVersion,
  updateVersion,
} from "@/lib/services/framework";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [currentId, setCurrentId] = useState<string>(
    openedId ?? versions[0]?.id ?? ""
  );
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [versionList, setVersionList] = useState<FrameworkVersion[]>(versions);

  // Sync external openedId
  useEffect(() => {
    if (openedId) setCurrentId(openedId);
  }, [openedId]);

  // Refresh versions list from DB
  const refreshVersions = async () => {
    try {
      const fresh = await listVersions();
      setVersionList(fresh);
    } catch (err: any) {
      console.error("Error refreshing versions:", err.message);
    }
  };

  // Load tree for version
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
    if (currentId) loadTree(currentId);
  }, [currentId]);

  // ───────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────
  const handleNew = async () => {
    try {
      const v = await createVersion("Untitled Framework");
      await refreshVersions();
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleEdit = async (id: string, newName: string) => {
    try {
      await updateVersion(id, { name: newName });
      await refreshVersions();
    } catch (err: any) {
      console.error("Error updating version:", err.message);
    }
  };

  const handleClone = async (id: string) => {
    try {
      const newId = await cloneVersion(id, "Cloned Framework");
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
        setCurrentId(versionList[0]?.id ?? "");
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

  // ───────────────────────────────────────────────
  return (
    <div>
      <VersionManager
        versions={versionList}
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
