"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listPillarCatalogue } from "@/lib/services/framework";

type CataloguePillar = {
  id: string;
  name: string;
  description?: string;
};

type Props = {
  versionId: string;
  existingPillarIds: string[];
  onClose: () => void;
  onSubmit: (payload: { mode: "catalogue"; pillarIds: string[] } | { mode: "new"; name: string; description?: string }) => void;
};

export default function AddPillarModal({ versionId, existingPillarIds, onClose, onSubmit }: Props) {
  const [activeTab, setActiveTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CataloguePillar[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listPillarCatalogue(versionId);
        setCatalogue(data ?? []);
      } catch (err: any) {
        console.error("Error loading catalogue:", err.message);
      }
    }
    load();
  }, [versionId]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Pillar</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`pb-2 ${activeTab === "catalogue" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setActiveTab("catalogue")}
        >
          From Catalogue
        </button>
        <button
          className={`pb-2 ${activeTab === "new" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setActiveTab("new")}
        >
          Create New
        </button>
      </div>

      {activeTab === "catalogue" && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {catalogue.map((pillar) => {
            const alreadyAdded = existingPillarIds.includes(pillar.id);
            return (
              <label
                key={pillar.id}
                className={`flex items-center space-x-2 p-2 rounded ${
                  alreadyAdded ? "bg-gray-100 text-gray-400" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={alreadyAdded}
                  checked={selected.includes(pillar.id)}
                  onChange={() => toggleSelect(pillar.id)}
                />
                <span className="font-medium">{pillar.name}</span>
                {pillar.description && (
                  <span className="text-xs text-gray-500">{pillar.description}</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {activeTab === "new" && (
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New pillar name"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-4">
        <button
          className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
          onClick={() => {
            if (activeTab === "catalogue") {
              if (selected.length === 0) return;
              onSubmit({ mode: "catalogue", pillarIds: selected });
            } else {
              if (!newName.trim()) return;
              onSubmit({ mode: "new", name: newName.trim(), description: newDescription.trim() || undefined });
            }
          }}
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
