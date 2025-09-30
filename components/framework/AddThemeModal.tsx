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
  const [catalogue, setCatalogue] = useState<CatalogueTheme[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    if (isPersisted) {
      listThemeCatalogue(versionId, parentPillarId).then((data) =>
        setCatalogue(data)
      );
    }
  }, [versionId, parentPillarId, isPersisted]);

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>

      {isPersisted ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select from catalogue:</p>
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((t) => (
              <label
                key={t.id}
                className={`flex items-center space-x-2 p-1 rounded ${
                  existingThemeIds.includes(t.id)
                    ? "text-gray-400 cursor-not-allowed"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={existingThemeIds.includes(t.id)}
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
              </label>
            ))}
          </div>
          <button
            onClick={() =>
              onSubmit({
                mode: "catalogue",
                items: catalogue.filter((t) => selected.includes(t.id)),
              })
            }
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Selected
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New theme name"
            className="w-full border rounded p-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full border rounded p-2 text-sm"
          />
          <button
            onClick={() =>
              onSubmit({ mode: "new", name: newName, description: newDescription })
            }
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Theme
          </button>
        </div>
      )}
    </Modal>
  );
}
