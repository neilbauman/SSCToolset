"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listSubthemeCatalogue } from "@/lib/services/framework";
import type { CatalogueSubtheme } from "@/lib/types/framework";

type Props = {
  versionId: string; // kept for parity; not used by listSubthemeCatalogue
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
        // ✅ listSubthemeCatalogue now only takes themeId
        const data = await listSubthemeCatalogue(parentThemeId);
        setSubthemes(data);
      } catch (err) {
        console.error("Error loading subtheme catalogue", err);
      }
    }
    if (isPersisted) load();
  }, [parentThemeId, isPersisted]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

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
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {subthemes.map((s) => {
            const disabled = existingSubthemeIds.includes(s.id);
            return (
              <label key={s.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  value={s.id}
                  disabled={disabled}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className={disabled ? "text-gray-400" : "text-gray-900"}>
                    {s.name}
                  </div>
                  {s.description && (
                    <div className="text-xs text-gray-500">{s.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Subtheme name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1 text-sm bg-gray-200 rounded">
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
