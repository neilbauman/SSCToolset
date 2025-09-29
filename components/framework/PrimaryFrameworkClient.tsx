"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";
import { supabaseBrowser } from "@/lib/supabase";
import { listVersions, cloneVersion, publishVersion } from "@/lib/services/framework";

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
  const [editMode, setEditMode] = useState(false);
  const [allVersions, setAllVersions] = useState<FrameworkVersion[]>(versions);

  const refreshVersions = async () => {
    const v = await listVersions();
    setAllVersions(v);
  };

  // Load framework tree
  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    const { data, error } = await supabaseBrowser.rpc("get_framework_tree", {
      v_version_id: versionId,
    });
    if (!error) setTree(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (currentId) loadTree(currentId);
  }, [currentId]);

  return (
    <div className="flex space-x-4">
      {/* Left side: version manager */}
      <div className="w-1/3">
        <VersionManager
          versions={allVersions}
          selectedId={currentId}
          editMode={editMode}
          onSelect={setCurrentId}
          onRefresh={refreshVersions}
          onClone={async (fromId) => {
            const newName = `${allVersions.find(v => v.id === fromId)?.name ?? "Copy"} (Clone)`;
            const v = await cloneVersion(fromId, newName);
            await refreshVersions();
            setCurrentId(v[0]);
          }}
          onDelete={async (id) => {
            await fetch(`/api/framework/versions/${id}`, { method: "DELETE" });
            await refreshVersions();
            if (id === currentId) {
              setCurrentId(allVersions[0]?.id ?? "");
            }
          }}
          onPublish={async (id) => {
            await publishVersion(id);
            await refreshVersions();
          }}
        />
        <div className="px-3 py-2">
          {editMode ? (
            <button
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setEditMode(false)}
            >
              Exit edit mode
            </button>
          ) : (
            <button
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setEditMode(true)}
            >
              Enter edit mode
            </button>
          )}
        </div>
      </div>

      {/* Right side: framework editor */}
      <div className="flex-1">
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
    </div>
  );
}
