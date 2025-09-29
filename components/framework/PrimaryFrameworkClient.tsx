"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import {
  supabaseBrowser
} from "@/lib/supabase";
import {
  listVersions,
  createVersion,
} from "@/lib/services/framework";

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
  const [allVersions, setAllVersions] = useState<FrameworkVersion[]>(versions);
  const [editMode, setEditMode] = useState(false);

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

  // Reload versions from DB
  const refreshVersions = async () => {
    try {
      const refreshed = await listVersions();
      setAllVersions(refreshed);
    } catch (err) {
      console.error("Failed to refresh versions:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers for version actions
  // ─────────────────────────────────────────────────────────────
  const handleNew = async () => {
    try {
      const newVersion = await createVersion("Untitled Framework");
      setCurrentId(newVersion.id);
      await refreshVersions();
    } catch (err) {
      console.error("Failed to create new version:", err);
    }
  };

  const handleEdit = (id: string) => {
    console.log("Edit version", id);
    // TODO: modal → update metadata
  };

  const handleClone = (id: string) => {
    console.log("Clone version", id);
    // TODO: call cloneVersion RPC
  };

  const handleDelete = (id: string) => {
    console.log("Delete version", id);
    // TODO: confirm → deleteVersion RPC
  };

  const handlePublish = (id: string) => {
    console.log("Publish version", id);
    // TODO: call publishVersion RPC
  };

  // ─────────────────────────────────────────────────────────────

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
        onToggleEdit={() => setEditMode((e) => !e)}
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
