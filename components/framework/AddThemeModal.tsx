"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import {
  listThemeCatalogue,
  createTheme,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
  pillarId: string;
  existing: NormalizedFramework[];
  onClose: () => void;
  onAdd: (theme: NormalizedFramework) => void;
};

export default function AddThemeModal({
  versionId,
  pillarId,
  existing,
  onClose,
  onAdd,
}: Props) {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const data = await listThemeCatalogue(versionId, pillarId);
      setCatalogue(data || []);
    }
    load();
  }, [versionId, pillarId]);

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Theme name"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Theme description"
          className="w-full rounded border px-3 py-2 text-sm"
        />

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
            onClick={async () => {
              if (!name.trim()) return;
              const created = await createTheme(pillarId, name.trim(), description);
              const newTheme: NormalizedFramework = {
                id: created.id,
                type: "theme",
                name: created.name,
                description: created.description,
                sort_order: (existing.length || 0) + 1,
                ref_code: created.ref_code ?? `T${pillarId}.${existing.length + 1}`,
                color: null,
                icon: null,
                themes: [],
                subthemes: [],
              };
              onAdd(newTheme);
              onClose();
            }}
          >
            Add
          </button>
        </div>
      </div>
    </Modal>
  );
}
