"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listSubthemeCatalogue } from "@/lib/services/framework";

type CatalogueSubtheme = {
  id: string;
  name: string;
  description?: string;
};

type Props = {
  versionId: string;
  parentThemeId: string;
  existingSubthemeIds: string[];
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CatalogueSubtheme[] }
      | { mode: "new"; name: string; description: string }
  ) => void;
};

export default function AddSubthemeModal({
  versionId,
  parentThemeId,
  existingSubthemeIds,
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueSubtheme[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listSubthemeCatalogue(versionId, parentThemeId);
        setCatalogue(data ?? []);
      } catch (err: any) {
        console.error("Error loading subtheme catalogue:", err.message);
      }
    }
    load();
  }, [versionId, parentThemeId]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Subtheme</h2>

      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`pb-2 ${
            activeTab === "catalogue"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("catalogue")}
        >
          From Catalogue
        </button>
        <button
          className={`pb-2 ${
            activeTab === "new"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("new")}
        >
          Create New
        </button>
      </div>

      {activeTab === "catalogue" && (
        <div className="max-h-60 overflow-y-auto">
          {catalogue.map((s) => {
            const disabled = existingSubthemeIds.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center space-x-2 py-1 ${
                  disabled ? "text-gray-400" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                />
                <span>{s.name}</span>
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
            placeholder="New subtheme name"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

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
              const chosen = catalogue.filter(
                (s) =>
                  !existingSubthemeIds.includes(s.id) && selectedIds.has(s.id)
              );
              if (chosen.length > 0) {
                onSubmit({ mode: "catalogue", items: chosen });
              }
            } else {
              if (!newName.trim()) return;
              onSubmit({
                mode: "new",
                name: newName.trim(),
                description: newDescription.trim() || "",
              });
            }
          }}
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
