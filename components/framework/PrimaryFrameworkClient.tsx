"use client";

import { useState, useEffect } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import VersionManager from "./VersionManager";

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

  // ───────────────────────────────
  // Tree loader via API route
  // ───────────────────────────────
  const loadTree = async (versionId: string) => {
    if (!versionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/framework/versions/${versionId}/tree`);
      const data = await res.json();
      setTree(data ?? []);
    } catch (err: any) {
      console.error("Error loading tree:", err.message);
    }
    setLoading(false);
  };

  // Sync openedId from parent
  useEffect(() => {
    if (openedId) {
      setCurrentId(openedId);
    }
  }, [openedId]);

  useEffect(() => {
    if (currentId) {
      loadTree(currentId);
    }
  }, [currentId]);

  return (
    <div>
      <VersionManager
        versions={versions}
        selectedId={currentId}
        editMode={editMode}
        onToggleEdit={() => setEditMode((m) => !m)}
        onSelect={(id) => setCurrentId(id)}
        onRefresh={async () => {
          if (currentId) await loadTree(currentId);
        }}
        onCreated={(id) => setCurrentId(id)}
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
