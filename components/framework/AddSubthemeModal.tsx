"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listSubthemeCatalogue } from "@/lib/services/framework";
import type { CatalogueSubtheme } from "@/lib/types/framework";

type Props = {
  versionId: string;
  parentThemeId: string;
  existingSubthemeIds: string[];
  isPersisted: boolean;
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
  isPersisted,
  onClose,
  onSubmit,
}: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueSubtheme[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    if (isPersisted) {
      listSubthemeCatalogue(versionId, parentThemeId).then((data) =>
        setCatalogue(data)
      );
    }
  }, [versionId, parentThemeId, isPersisted]);

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Subtheme</h2>

      {isPersisted ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select from catalogue:</p>
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((s) => (
              <label
                key={s.id}
                className={`flex items-center space-x-2 p-1 rounded ${
                  existingSubthemeIds.includes(s.id)
                    ? "text-gray-400 cursor-not-allowed"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={existingSubthemeIds.includes(s.id)}
                  checked={selected.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, s.id]);
                    } else {
                      setSelected(selected.filter((id) => id !== s.id));
                    }
                  }}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() =>
              onSubmit({
                mode: "catalogue",
                items: catalogue.filter((s) => selected.includes(s.id)),
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
            placeholder="New subtheme name"
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
            Add Subtheme
          </button>
        </div>
      )}
    </Modal>
  );
}
