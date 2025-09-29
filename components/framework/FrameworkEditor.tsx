"use client";

import { useState, useEffect } from "react";

type Props = {
  tree: any[];
  versionId: string;
  editMode: boolean;
  onChanged: () => void; // still used for reloads
};

export default function FrameworkEditor({ tree, versionId, editMode, onChanged }: Props) {
  const [localTree, setLocalTree] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);

  // load tree into local state whenever versionId or tree changes
  useEffect(() => {
    setLocalTree(tree);
    setDirty(false);
  }, [tree, versionId]);

  // placeholder mutation actions — for now just modify local state
  function handleMockEdit() {
    if (!editMode) return;
    const newTree = [...localTree, { id: Date.now().toString(), name: "Mock Item" }];
    setLocalTree(newTree);
    setDirty(true);
  }

  // save changes (not wired yet)
  async function handleSave() {
    console.log("Saving changes (not wired to Supabase yet):", localTree);
    setDirty(false);
    // Later: call mutations, then onChanged()
  }

  // discard changes → reset from prop tree
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
              {editMode && (
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={handleMockEdit}
                >
                  + Mock Edit
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
