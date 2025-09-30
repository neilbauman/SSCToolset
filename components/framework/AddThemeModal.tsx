"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listThemeCatalogue } from "@/lib/services/framework";
import type { CatalogueTheme } from "@/lib/types/framework";

type Props = {
  versionId: string;
  parentPillarId: string;
  existingThemeIds: string[];
  existingSubthemeIds: string[];
  isPersisted: boolean;
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
  onClose,
  onSubmit,
}: Props) {
  const [themes, setThemes] = useState<CatalogueTheme[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [mode, setMode] = useState<"catalogue" | "new">("catalogue");

  useEffect(() => {
    async function load() {
      try {
        const data = await listThemeCatalogue(versionId, parentPillarId);
        setThemes(data);
      } catch (err) {
        console.error("Error loading theme catalogue", err);
      }
    }
    if (isPersisted) load();
  }, [versionId, parentPillarId, isPersisted]);

  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>
      <div className="mb-4 flex space-x-4">
        <button
          className={`px-3 py-1 rounded ${
            mode === "catalogue" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("catalogue")}
        >
          From Catalogue
        </button>
        <button
          className={`px-3 py-1 rounded ${
            mode === "new" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("new")}
        >
          New Theme
        </button>
      </div>

      {mode === "catalogue" ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {themes.map((t) => {
            const disabled = existingThemeIds.includes(t.id);
            return (
              <label
                key={t.id}
                className={`flex items-center space-x-2 p-2 rounded ${
                  disabled ? "bg-gray-100 text-gray-400" : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(t.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, t.id]);
                    } else {
                      setSelected(selected.filter((id) => id !== t.id));
                    }
                  }}
                />
                <span>{t.name}</span>
                {t.description && (
                  <span className="text-xs text-gray-500 ml-2">
                    {t.description}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Name"
            className="w-full border rounded p-2"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className="w-full border rounded p-2"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex justify-end space-x-2">
        <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200">
          Cancel
        </button>
        <button
          onClick={() => {
            if (mode === "catalogue") {
              const items = themes.filter((t) => selected.includes(t.id));
              onSubmit({ mode: "catalogue", items });
            } else {
              onSubmit({ mode: "new", name: newName, description: newDescription });
            }
            onClose();
          }}
          disabled={mode === "new" && !newName.trim()}
          className="px-3 py-1 rounded bg-blue-600 text-white"
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
