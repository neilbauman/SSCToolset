"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { listThemeCatalogue } from "@/lib/services/framework";
import type { CatalogueTheme } from "@/lib/types/framework";

type Props = {
  versionId: string; // kept for parity with other modals (not used by listThemeCatalogue)
  parentPillarId: string;
  existingThemeIds: string[];
  existingSubthemeIds: string[]; // reserved for future "include children" UX
  isPersisted: boolean;
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CatalogueTheme[] }
      | { mode: "new"; name: string; description?: string }
  ) => void;
};

export default function AddThemeModal({
  parentPillarId,
  existingThemeIds,
  isPersisted,
  onClose,
  onSubmit,
}: Props) {
  const [themes, setThemes] = useState<CatalogueTheme[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        // ✅ listThemeCatalogue now only takes pillarId
        const data = await listThemeCatalogue(parentPillarId);
        setThemes(data);
      } catch (err) {
        console.error("Error loading theme catalogue", err);
      }
    }
    if (isPersisted) load();
  }, [parentPillarId, isPersisted]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function handleSubmit() {
    if (selected.length > 0) {
      const items = themes.filter((t) => selected.includes(t.id));
      onSubmit({ mode: "catalogue", items });
    } else {
      onSubmit({ mode: "new", name, description });
    }
    onClose();
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>

      {isPersisted ? (
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {themes.map((t) => {
            const disabled = existingThemeIds.includes(t.id);
            return (
              <label key={t.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  value={t.id}
                  disabled={disabled}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className={disabled ? "text-gray-400" : "text-gray-900"}>
                    {t.name}
                  </div>
                  {t.description && (
                    <div className="text-xs text-gray-500">{t.description}</div>
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
            placeholder="Theme name"
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
