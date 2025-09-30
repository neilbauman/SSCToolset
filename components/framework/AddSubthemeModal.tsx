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
      | { mode: "new"; name: string; description?: string }
  ) => void;
};

export default function AddSubthemeModal({
  parentThemeId,
  existingSubthemeIds,
  isPersisted,
  onClose,
  onSubmit,
}: Props) {
  const [subthemes, setSubthemes] = useState<CatalogueSubtheme[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listSubthemeCatalogue(parentThemeId);
        setSubthemes(data);
      } catch (err) {
        console.error("Error loading subtheme catalogue", err);
      }
    }
    if (isPersisted) load();
  }, [parentThemeId, isPersisted]);

  function handleSubmit() {
    if (selected.length > 0) {
      const items = subthemes.filter((s) => selected.includes(s.id));
      onSubmit({ mode: "catalogue", items });
    } else {
      onSubmit({ mode: "new", name, description });
    }
    onClose();
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Subtheme</h2>
      {isPersisted ? (
        <div className="space-y-2">
          {subthemes.map((s) => (
            <label key={s.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={s.id}
                disabled={existingSubthemeIds.includes(s.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected([...selected, s.id]);
                  } else {
                    setSelected(selected.filter((id) => id !== s.id));
                  }
                }}
              />
              <span
                className={
                  existingSubthemeIds.includes(s.id)
                    ? "text-gray-400"
                    : "text-gray-800"
                }
              >
                {s.name}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Subtheme name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
      )}
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-200 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
