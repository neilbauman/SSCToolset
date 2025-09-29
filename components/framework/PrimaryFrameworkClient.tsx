"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";
import { createVersion, listVersions } from "@/lib/services/framework";
import NewVersionModal from "./NewVersionModal";

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

  const [editMode, setEditMode] = useState<boolean>(true);

  // modal state
  const [showNewModal, setShowNewModal] = useState(false);

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

  // Refresh version list
  const refreshVersions = async () => {
    try {
      const data = await listVersions();
      setAllVersions(data);
      if (!data.find((v) => v.id === currentId) && data.length > 0) {
        setCurrentId(data[0].id);
      }
    } catch (err) {
      console.error("Error refreshing versions:", err);
    }
  };

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  // ─────────────────────────────────────────────────────────────
  // Handlers for version actions
  // ─────────────────────────────────────────────────────────────
  const handleNew = async (name: string) => {
    try {
      const v = await createVersion(name);
      await refreshVersions();
      setCurrentId(v.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleEdit = (id: string) => {
    console.log("Edit version", id);
    // TODO: open modal → update name/metadata
  };

  const handleClone = (id: string) => {
    console.log("Clone version", id);
    // TODO
  };

  const handleDelete = (id: string) => {
    console.log("Delete version", id);
    // TODO
  };

  const handlePublish = (id: string) => {
    console.log("Publish version", id);
    // TODO
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <div>
      <VersionManager
        versions={allVersions}
        selectedId={currentId}
        editMode={editMode}
        onToggleEdit={() => setEditMode(!editMode)}
        onSelect={(id) => setCurrentId(id)}
        onNew={() => setShowNewModal(true)}
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

      {/* New Version Modal */}
      {showNewModal && (
        <NewVersionModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleNew}
        />
      )}
    </div>
  );
}
