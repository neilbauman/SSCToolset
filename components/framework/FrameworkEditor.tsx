"use client";

import { useState, useEffect } from "react";
import AddPillarModal from "./AddPillarModal";

type Props = {
  tree: any[];
  versionId: string;
  editMode: boolean;
  onChanged: () => void;
};

export default function FrameworkEditor({ tree, versionId, editMode, onChanged }: Props) {
  const [localTree, setLocalTree] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showAddPillar, setShowAddPillar] = useState(false);

  useEffect(() => {
    setLocalTree(tree);
    setDirty(false);
  }, [tree, versionId]);

  function handleAddPillarsFromCatalogue(ids: string[]) {
    const newPillars = ids.map((id) => ({
      id,
      name: `Pillar ${id}`, // placeholder until Supabase join data is wired
    }));
    setLocalTree([...localTree, ...newPillars]);
    setDirty(true);
  }

  function handleCreateNewPillar(name: string, description?: string) {
    const newPillar = {
      id: `temp-${Date.now()}`,
      name,
      description,
    };
    setLocalTree([...localTree, newPillar]);
    setDirty(true);
  }

  async function handleSave() {
    console.log("Saving changes (not wired yet):", localTree);
    setDirty(false);
    // Later: call Supabase inserts, then onChanged()
  }

  function handleDiscard() {
    setLocalTree(tree);
    setDirty(false);
  }

  return (
    <div className="border rounded-md p-4">
      {/* Save / Discard controls */}
      {editMode && dirty && (
        <div className="flex space-x-2 mb-4">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            onClick={handleSave}
          >
            Save (not wired yet)
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            onClick={handleDiscard}
          >
            Discard
          </button>
        </div>
      )}

      {/* Add Pillar */}
      {editMode && (
        <div className="mb-4">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            onClick={() => setShowAddPillar(true)}
          >
            + Add Pillar
          </button>
        </div>
      )}

      {/* Framework Tree */}
      <div className="space-y-2">
        {localTree.length === 0 ? (
          <div className="text-gray-500 text-sm">No items in this framework.</div>
        ) : (
          localTree.map((item: any) => (
            <div
              key={item.id}
              className="p-2 border rounded-md flex justify-between items-center bg-gray-50"
            >
              <span>{item.name}</span>
            </div>
          ))
        )}
      </div>

      {/* Add Pillar Modal */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((p: any) => p.id)}
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddPillarsFromCatalogue(payload.pillarIds);
            } else {
              handleCreateNewPillar(payload.name, payload.description);
            }
            setShowAddPillar(false);
          }}
        />
      )}
    </div>
  );
}
