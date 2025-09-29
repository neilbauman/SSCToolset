"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";
import {
  createVersion,
  listVersions,
  cloneVersion,
} from "@/lib/services/framework";
import NewVersionModal from "./NewVersionModal";
import CloneVersionModal from "./CloneVersionModal";

// simple inline toast helper
function toast(msg: string) {
  alert(msg); // replace with nicer UI later
}

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
  const [allVersions, setAllVersions] = useState<FrameworkVersion[]>(versions);

  const [editMode, setEditMode] = useState<boolean>(true);

  // modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState<null | string>(null);

  // Sync when parent provides openedId
  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

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

  // ───────────────────────────
  // Handlers
  // ───────────────────────────
  const handleNew = async (name: string) => {
    try {
      const v = await createVersion(name);
      await refreshVersions();
      setCurrentId(v.id);
      toast(`Created new version: ${v.name}`);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
      toast("Failed to create version");
    }
  };

  const handleClone = async (fromId: string, newName: string) => {
    try {
      const newId = await cloneVersion(fromId, newName); // RPC returns UUID
      await refreshVersions();
      setCurrentId(newId as string);
      toast(`Cloned version → ${newName}`);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
      toast("Failed to clone version");
    }
  };

  return (
    <div>
      <VersionManager
        versions={allVersions}
        selectedId={currentId}
        editMode={editMode}
        onToggleEdit={() => setEditMode(!editMode)}
        onSelect={(id) => setCurrentId(id)}
        onNew={() => setShowNewModal(true)}
        onEdit={() => {}}
        onClone={(id) => setShowCloneModal(id)}
        onDelete={() => {}}
        onPublish={() => {}}
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

      {/* Clone Version Modal */}
      {showCloneModal && (
        <CloneVersionModal
          fromId={showCloneModal}
          onClose={() => setShowCloneModal(null)}
          onClone={(newName) => handleClone(showCloneModal, newName)}
        />
      )}
    </div>
  );
}
