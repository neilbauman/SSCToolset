"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listThemeCatalogue, CatalogueTheme } from "@/lib/services/framework";

type Props = {
  versionId: string;
  parentPillarId: string;
  existingThemeIds: string[];
  existingSubthemeIds: string[];
  isPersisted: boolean;
  catalogueThemes?: CatalogueTheme[];
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CatalogueTheme[] }
      | { mode: "new"; name: string; description: string }
  ) => void;
};

export default function AddThemeModal({
  versionId,
  parentPillarId,
  existingThemeIds,
  isPersisted,
  catalogueThemes = [],
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueTheme[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    async function load() {
      if (isPersisted) {
        try {
          const data = await listThemeCatalogue(versionId, parentPillarId);
          setCatalogue(data ?? []);
        } catch (err: any) {
          console.error("Error loading theme catalogue:", err.message);
        }
      } else {
        setCatalogue(catalogueThemes);
      }
    }
    load();
  }, [isPersisted, versionId, parentPillarId, catalogueThemes]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>

      {/* Tabs */}
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
          {catalogue.map((t) => {
            const disabled = existingThemeIds.includes(t.id);
            return (
              <label
                key={t.id}
                className={`flex items-center space-x-2 py-1 ${
                  disabled ? "text-gray-400" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelect(t.id)}
                />
                <div>
                  <div>{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-gray-500">{t.description}</div>
                  )}
                </div>
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
            placeholder="New theme name"
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
                (t) => !existingThemeIds.includes(t.id) && selectedIds.has(t.id)
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
